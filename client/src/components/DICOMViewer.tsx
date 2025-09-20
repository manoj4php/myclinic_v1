import { useEffect, useRef, useState } from 'react';

// Extend window type for our global flag
declare global {
  interface Window {
    cornerstoneToolsInitialized?: boolean;
  }
}
// @ts-ignore - Legacy medical imaging libraries without official TypeScript support
import cornerstone from 'cornerstone-core';
// @ts-ignore
import cornerstoneTools from 'cornerstone-tools';
// @ts-ignore
import cornerstoneWebImageLoader from 'cornerstone-web-image-loader';
// @ts-ignore
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
// @ts-ignore
import dicomParser from 'dicom-parser';
// @ts-ignore
import cornerstoneMath from 'cornerstone-math';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Move, 
  Ruler, 
  Square, 
  Circle,
  Type,
  Download,
  Maximize2,
  Settings,
  RefreshCw,
  Home,
  Contrast,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';

interface DICOMViewerProps {
  imageUrl: string;
  patientInfo?: {
    name: string;
    id: string;
    age: number | string;
    sex: string;
    studyDate?: string;
  };
  onClose?: () => void;
  isDICOM?: boolean;
}

export function DICOMViewer({ imageUrl, patientInfo, onClose, isDICOM = false }: DICOMViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTool, setActiveTool] = useState('Wwwc');
  const [imageData, setImageData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [totalFrames, setTotalFrames] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('DICOM Viewer: Starting initialization...');
    
    // Check if cornerstone is properly loaded
    if (!cornerstone || typeof cornerstone.enable !== 'function') {
      console.error('DICOM Viewer: Cornerstone library not properly loaded');
      setError('Medical viewer initialization failed. Please refresh the page.');
      return;
    }

    try {
      // Ensure cornerstone tools is initialized only once globally
      if (!window.cornerstoneToolsInitialized) {
        // Initialize cornerstone
        cornerstoneWebImageLoader.external.cornerstone = cornerstone;
        cornerstoneWebImageLoader.external.dicomParser = dicomParser;
        
        // Initialize WADO image loader for DICOM
        cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
        cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
        
        // Configure WADO loader with error handling
        try {
          cornerstoneWADOImageLoader.configure({
            useWebWorkers: false, // Disable web workers to avoid CORS issues
          });
        } catch (configError) {
          console.warn('DICOM Viewer: WADO loader configuration warning:', configError);
        }
        
        // Register image loaders
        cornerstone.registerImageLoader('wadouri', cornerstoneWADOImageLoader.wadouri.loadImage);
        cornerstone.registerImageLoader('http', cornerstoneWebImageLoader.loadImage);
        cornerstone.registerImageLoader('https', cornerstoneWebImageLoader.loadImage);
        
        // Initialize cornerstone tools with minimal configuration
        cornerstoneTools.external.cornerstone = cornerstone;
        cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
        
        try {
          cornerstoneTools.init({
            mouseEnabled: true,
            touchEnabled: false, // Disable touch to avoid pointer events issues
            globalToolSyncEnabled: false,
            showSVGCursors: false, // Disable SVG cursors to avoid rendering issues
          });
          
          // Add tools only once globally
          cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
          cornerstoneTools.addTool(cornerstoneTools.PanTool);
          cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
          cornerstoneTools.addTool(cornerstoneTools.LengthTool);
          cornerstoneTools.addTool(cornerstoneTools.AngleTool);
          cornerstoneTools.addTool(cornerstoneTools.RectangleRoiTool);
          cornerstoneTools.addTool(cornerstoneTools.EllipticalRoiTool);
          cornerstoneTools.addTool(cornerstoneTools.ArrowAnnotateTool);
          
        } catch (toolsError) {
          console.warn('DICOM Viewer: Tools initialization warning:', toolsError);
          // Continue without tools if initialization fails
        }
        
        window.cornerstoneToolsInitialized = true;
      }

      // Enable viewport
      if (viewportRef.current && !isInitialized) {
        console.log('DICOM Viewer: Enabling cornerstone viewport');
        cornerstone.enable(viewportRef.current);
        setIsInitialized(true);
        console.log('DICOM Viewer: Viewport enabled successfully');
      }
    } catch (error) {
      console.error('DICOM Viewer: Error initializing cornerstone:', error);
      // Don't set error, try to continue with basic functionality
      console.log('DICOM Viewer: Attempting basic initialization...');
      
      try {
        if (viewportRef.current && !isInitialized) {
          cornerstone.enable(viewportRef.current);
          setIsInitialized(true);
          console.log('DICOM Viewer: Basic viewport enabled');
        }
      } catch (basicError) {
        console.error('DICOM Viewer: Basic initialization also failed:', basicError);
        setError('Failed to initialize medical viewer. Please refresh the page.');
      }
    }

    return () => {
      try {
        if (viewportRef.current && isInitialized) {
          cornerstone.disable(viewportRef.current);
        }
      } catch (error) {
        console.error('DICOM Viewer: Error disabling cornerstone:', error);
      }
    };
  }, [imageUrl]);

  // Separate effect to load image after initialization
  useEffect(() => {
    if (isInitialized && viewportRef.current) {
      loadImage();
    }
  }, [isInitialized, imageUrl]);

  const loadImage = async () => {
    if (!viewportRef.current) return;

    // Check if imageUrl is valid
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('DICOM Viewer: Invalid or missing imageUrl:', imageUrl);
      setError('No image URL provided');
      setIsLoading(false);
      return;
    }

    console.log('DICOM Viewer: Starting image load', { imageUrl, isDICOM });
    setIsLoading(true);
    setError(null);

    try {
      let imageId: string;
      
      if (isDICOM) {
        // For DICOM files
        imageId = `wadouri:${imageUrl}`;
        console.log('DICOM Viewer: Loading as DICOM with imageId:', imageId);
      } else {
        // For regular images, ensure proper URL scheme
        imageId = imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl}`;
        console.log('DICOM Viewer: Loading as regular image with imageId:', imageId);
      }

      console.log('DICOM Viewer: About to call cornerstone.loadImage');
      const image = await cornerstone.loadImage(imageId);
      console.log('DICOM Viewer: Image loaded successfully', image);
      
      cornerstone.displayImage(viewportRef.current, image);
      setImageData(image);
      setIsLoading(false);

      // Set up tools
      setupTools();
      console.log('DICOM Viewer: Image display completed successfully');
    } catch (error) {
      console.error('DICOM Viewer: Error loading image:', error);
      
      // Fallback: try loading as regular image
      try {
        console.log('DICOM Viewer: Trying fallback loading as regular image');
        if (!imageUrl || typeof imageUrl !== 'string') {
          throw new Error('Invalid imageUrl for fallback loading');
        }
        const fallbackImageId = imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl}`;
        const image = await cornerstone.loadImage(fallbackImageId);
        cornerstone.displayImage(viewportRef.current, image);
        setImageData(image);
        setIsLoading(false);
        setupTools();
        console.log('DICOM Viewer: Fallback loading successful');
      } catch (fallbackError) {
        console.error('DICOM Viewer: Fallback error:', fallbackError);
        const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        setError(`Failed to load image: ${errorMessage || 'Unknown error'}`);
        setIsLoading(false);
        console.error('DICOM Viewer: Complete failure to load image');
      }
    }
  };

  const setupTools = () => {
    if (!viewportRef.current) return;

    const element = viewportRef.current;

    // Tools are already added globally, just activate them for this viewport
    try {
      cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
      cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 2 });
      cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 4 });
      
      // Update active tool state
      setActiveTool('Wwwc');
    } catch (error) {
      console.warn('DICOM Viewer: Error setting up tools:', error);
    }
  };

  const activateTool = (toolName: string) => {
    if (!viewportRef.current) return;

    try {
      // Deactivate all tools first
      cornerstoneTools.setToolPassive('Wwwc');
      cornerstoneTools.setToolPassive('Pan');
      cornerstoneTools.setToolPassive('Zoom');
      cornerstoneTools.setToolPassive('Length');
      cornerstoneTools.setToolPassive('Angle');
      cornerstoneTools.setToolPassive('RectangleRoi');
      cornerstoneTools.setToolPassive('EllipticalRoi');
      cornerstoneTools.setToolPassive('ArrowAnnotate');

      // Activate selected tool
      cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
      setActiveTool(toolName);
    } catch (error) {
      console.warn('DICOM Viewer: Error activating tool:', error);
    }
  };

  const zoomIn = () => {
    if (!viewportRef.current) return;
    const viewport = cornerstone.getViewport(viewportRef.current);
    viewport.scale += 0.25;
    cornerstone.setViewport(viewportRef.current, viewport);
  };

  const zoomOut = () => {
    if (!viewportRef.current) return;
    const viewport = cornerstone.getViewport(viewportRef.current);
    viewport.scale = Math.max(0.25, viewport.scale - 0.25);
    cornerstone.setViewport(viewportRef.current, viewport);
  };

  const resetView = () => {
    if (!viewportRef.current) return;
    cornerstone.reset(viewportRef.current);
  };

  const rotate = () => {
    if (!viewportRef.current) return;
    const viewport = cornerstone.getViewport(viewportRef.current);
    viewport.rotation += 90;
    cornerstone.setViewport(viewportRef.current, viewport);
  };

  const toggleInvert = () => {
    if (!viewportRef.current) return;
    const viewport = cornerstone.getViewport(viewportRef.current);
    viewport.invert = !viewport.invert;
    cornerstone.setViewport(viewportRef.current, viewport);
  };

  const downloadImage = () => {
    if (!viewportRef.current) return;
    
    const canvas = cornerstone.getEnabledElement(viewportRef.current).canvas;
    const link = document.createElement('a');
    link.download = `medical-image-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="h-full bg-black text-white overflow-hidden flex flex-col" data-testid="dicom-viewer">
      {/* Patient Info Bar */}
      <div className="bg-gray-900 p-2 border-b border-gray-700 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {patientInfo && (
              <>
                <div>
                  <span className="text-gray-400">Patient:</span>
                  <span className="ml-2 font-medium text-white">{patientInfo.name}</span>
                </div>
                <div>
                  <span className="text-gray-400">ID:</span>
                  <span className="ml-2 font-mono text-white">{patientInfo.id.slice(-8).toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Age/Sex:</span>
                  <span className="ml-2 text-white">{patientInfo.age}Y / {patientInfo.sex.toUpperCase()}</span>
                </div>
              </>
            )}
          </div>
          <Badge variant="secondary" className="bg-blue-700 text-blue-100">
            {isDICOM ? 'DICOM' : 'IMAGE'}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Tool Palette */}
        <div className="w-20 bg-gray-900 border-r border-gray-700 p-2">
          <div className="space-y-2">
            <div className="text-xs text-gray-400 mb-3">Mouse Functions</div>
            
            <Button
              size="sm"
              variant={activeTool === 'Wwwc' ? 'default' : 'ghost'}
              className="w-full p-2 text-white hover:bg-gray-700"
              onClick={() => activateTool('Wwwc')}
              data-testid="tool-window-level"
            >
              <Contrast className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant={activeTool === 'Pan' ? 'default' : 'ghost'}
              className="w-full p-2 text-white hover:bg-gray-700"
              onClick={() => activateTool('Pan')}
              data-testid="tool-pan"
            >
              <Move className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant={activeTool === 'Zoom' ? 'default' : 'ghost'}
              className="w-full p-2 text-white hover:bg-gray-700"
              onClick={() => activateTool('Zoom')}
              data-testid="tool-zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <Separator className="bg-gray-700" />
            
            <div className="text-xs text-gray-400 mb-2">Annotations</div>

            <Button
              size="sm"
              variant={activeTool === 'Length' ? 'default' : 'ghost'}
              className="w-full p-2 text-white hover:bg-gray-700"
              onClick={() => activateTool('Length')}
              data-testid="tool-length"
            >
              <Ruler className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant={activeTool === 'RectangleRoi' ? 'default' : 'ghost'}
              className="w-full p-2 text-white hover:bg-gray-700"
              onClick={() => activateTool('RectangleRoi')}
              data-testid="tool-rectangle"
            >
              <Square className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant={activeTool === 'EllipticalRoi' ? 'default' : 'ghost'}
              className="w-full p-2 text-white hover:bg-gray-700"
              onClick={() => activateTool('EllipticalRoi')}
              data-testid="tool-ellipse"
            >
              <Circle className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant={activeTool === 'ArrowAnnotate' ? 'default' : 'ghost'}
              className="w-full p-2 text-white hover:bg-gray-700"
              onClick={() => activateTool('ArrowAnnotate')}
              data-testid="tool-annotate"
            >
              <Type className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Viewer Area */}
        <div className="flex-1 flex flex-col">
          {/* Viewer Controls */}
          <div className="bg-gray-800 p-2 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={zoomIn}
                  className="text-white hover:bg-gray-700"
                  data-testid="button-zoom-in"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={zoomOut}
                  className="text-white hover:bg-gray-700"
                  data-testid="button-zoom-out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetView}
                  className="text-white hover:bg-gray-700"
                  data-testid="button-reset"
                >
                  <Home className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={rotate}
                  className="text-white hover:bg-gray-700"
                  data-testid="button-rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleInvert}
                  className="text-white hover:bg-gray-700"
                  data-testid="button-invert"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="bg-gray-600 h-6" />

                {/* Multi-frame controls (if applicable) */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-gray-700"
                  data-testid="button-prev-frame"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-white hover:bg-gray-700"
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-gray-700"
                  data-testid="button-next-frame"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>

                <span className="text-xs text-gray-400">
                  {currentFrame} / {totalFrames}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={downloadImage}
                  className="text-white hover:bg-gray-700"
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-gray-700"
                  data-testid="button-fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-gray-700"
                  data-testid="button-settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Image Viewport */}
          <div className="flex-1 flex items-center justify-center bg-black relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
                <div className="flex flex-col items-center space-y-3 text-white">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading image...</span>
                </div>
              </div>
            )}
            
            {error && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
                <div className="flex flex-col items-center space-y-3 text-white max-w-md text-center">
                  <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-xl">⚠</span>
                  </div>
                  <h3 className="font-medium">Failed to Load Image</h3>
                  <p className="text-sm text-gray-300">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => loadImage()}
                    className="text-white border-white hover:bg-white hover:text-black"
                    data-testid="button-retry-image"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            )}
            
            <div
              ref={viewportRef}
              className="max-w-full max-h-full bg-black cursor-crosshair"
              style={{ minHeight: '400px', minWidth: '400px' }}
              data-testid="image-viewport"
            />
          </div>

          {/* Status Bar */}
          <div className="bg-gray-800 p-2 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-4">
                <span>Active Tool: {activeTool}</span>
                {imageData && (
                  <>
                    <span>Size: {imageData.width} x {imageData.height}</span>
                    <span>Bits: {imageData.color ? '24' : '8'}</span>
                  </>
                )}
              </div>
              <div>
                <span>{isLoading ? 'Loading...' : error ? 'Error' : 'Ready'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}