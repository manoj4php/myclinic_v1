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
  SkipForward,
  Triangle,
  PenTool,
  Target
} from 'lucide-react';

interface DICOMViewerProps {
  imageUrl?: string;  // Made optional for backward compatibility
  imageUrls?: string[];  // New prop for multiple images
  initialImageIndex?: number;  // Starting image index for multi-image mode
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

export function DICOMViewer({ imageUrl, imageUrls, initialImageIndex = 0, patientInfo, onClose, isDICOM = false }: DICOMViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTool, setActiveTool] = useState('Wwwc');
  const [imageData, setImageData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [totalFrames, setTotalFrames] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Multi-file support
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  
  // Initialize images array from props
  useEffect(() => {
    if (imageUrls && imageUrls.length > 0) {
      setImages(imageUrls);
      setCurrentImageIndex(Math.min(initialImageIndex, imageUrls.length - 1));
    } else if (imageUrl) {
      setImages([imageUrl]);
      setCurrentImageIndex(0);
    }
  }, [imageUrl, imageUrls, initialImageIndex]);

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
        console.log('DICOM Viewer: Initializing cornerstone libraries...');
        
        // Initialize cornerstone web image loader
        if (cornerstoneWebImageLoader && cornerstoneWebImageLoader.external) {
          cornerstoneWebImageLoader.external.cornerstone = cornerstone;
          if (dicomParser) cornerstoneWebImageLoader.external.dicomParser = dicomParser;
          
          // Configure web image loader with authentication
          try {
            if (cornerstoneWebImageLoader.configure) {
              cornerstoneWebImageLoader.configure({
                beforeSend: function(xhr: XMLHttpRequest, imageId: string) {
                  // Add JWT authentication header for our API endpoints
                  const token = localStorage.getItem('jwtToken');
                  if (token && imageId && (imageId.includes('/api/') || imageId.includes(window.location.origin))) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                    console.log('DICOM Viewer: Adding auth header to web image loader request:', imageId);
                  }
                }
              });
              console.log('DICOM Viewer: Web image loader configured successfully');
            }
          } catch (configError) {
            console.warn('DICOM Viewer: Web image loader configuration warning:', configError);
          }
        }
        
        // Initialize WADO image loader for DICOM
        if (cornerstoneWADOImageLoader && cornerstoneWADOImageLoader.external) {
          cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
          if (dicomParser) cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
          
          // Configure WADO loader with error handling
          try {
            cornerstoneWADOImageLoader.configure({
              useWebWorkers: false, // Disable web workers to avoid CORS issues
              beforeSend: function(xhr: XMLHttpRequest, imageId: string) {
                // Add JWT authentication header for our API endpoints
                const token = localStorage.getItem('jwtToken');
                if (token && imageId && (imageId.includes('/api/') || imageId.includes(window.location.origin))) {
                  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                  console.log('DICOM Viewer: Adding auth header to WADO loader request:', imageId);
                }
              }
            });
            console.log('DICOM Viewer: WADO loader configured successfully');
          } catch (configError) {
            console.warn('DICOM Viewer: WADO loader configuration warning:', configError);
          }
        }
        
        // Register image loaders with error handling
        try {
          if (cornerstoneWADOImageLoader?.wadouri?.loadImage) {
            cornerstone.registerImageLoader('wadouri', cornerstoneWADOImageLoader.wadouri.loadImage);
            console.log('DICOM Viewer: WADO image loader registered');
          }
          if (cornerstoneWebImageLoader?.loadImage) {
            // Create a wrapper for the web image loader to add authentication
            const originalWebLoader = cornerstoneWebImageLoader.loadImage;
            const authenticatedWebLoader = (imageId: string) => {
              console.log('DICOM Viewer: Web loader called with imageId:', imageId);
              // Add auth headers through a custom loader
              if (imageId.includes('/api/') || imageId.includes(window.location.origin)) {
                return new Promise((resolve, reject) => {
                  const token = localStorage.getItem('jwtToken');
                  const xhr = new XMLHttpRequest();
                  xhr.open('GET', imageId, true);
                  xhr.responseType = 'arraybuffer';
                  
                  if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                    console.log('DICOM Viewer: Added auth header to manual request:', imageId);
                  }
                  
                  xhr.onload = function() {
                    if (xhr.status === 200) {
                      // Convert response to a format cornerstone can use
                      const arrayBuffer = xhr.response;
                      const blob = new Blob([arrayBuffer]);
                      const url = URL.createObjectURL(blob);
                      
                      // Call original loader with blob URL
                      originalWebLoader(url).then(resolve).catch(reject);
                    } else {
                      reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                    }
                  };
                  
                  xhr.onerror = function() {
                    reject(new Error('Network error'));
                  };
                  
                  xhr.send();
                });
              } else {
                // Use original loader for external URLs
                return originalWebLoader(imageId);
              }
            };
            
            cornerstone.registerImageLoader('http', authenticatedWebLoader);
            cornerstone.registerImageLoader('https', authenticatedWebLoader);
            console.log('DICOM Viewer: Authenticated web image loaders registered');
          }
        } catch (loaderError) {
          console.warn('DICOM Viewer: Image loader registration warning:', loaderError);
        }
        
        // Initialize cornerstone tools with minimal configuration
        if (cornerstoneTools) {
          cornerstoneTools.external.cornerstone = cornerstone;
          if (cornerstoneMath) cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
          
          try {
            cornerstoneTools.init({
              mouseEnabled: true,
              touchEnabled: false, // Disable touch to avoid pointer events issues
              globalToolSyncEnabled: false,
              showSVGCursors: false, // Disable SVG cursors to avoid rendering issues
            });
            
            // Add tools only once globally - using optional chaining to prevent errors
            if (cornerstoneTools.WwwcTool) cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
            if (cornerstoneTools.PanTool) cornerstoneTools.addTool(cornerstoneTools.PanTool);
            if (cornerstoneTools.ZoomTool) cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
            if (cornerstoneTools.LengthTool) cornerstoneTools.addTool(cornerstoneTools.LengthTool);
            if (cornerstoneTools.AngleTool) cornerstoneTools.addTool(cornerstoneTools.AngleTool);
            if (cornerstoneTools.RectangleRoiTool) cornerstoneTools.addTool(cornerstoneTools.RectangleRoiTool);
            if (cornerstoneTools.EllipticalRoiTool) cornerstoneTools.addTool(cornerstoneTools.EllipticalRoiTool);
            if (cornerstoneTools.ArrowAnnotateTool) cornerstoneTools.addTool(cornerstoneTools.ArrowAnnotateTool);
            if (cornerstoneTools.TextMarkerTool) cornerstoneTools.addTool(cornerstoneTools.TextMarkerTool);
            if (cornerstoneTools.FreehandRoiTool) cornerstoneTools.addTool(cornerstoneTools.FreehandRoiTool);
            if (cornerstoneTools.ProbeTool) cornerstoneTools.addTool(cornerstoneTools.ProbeTool);
            
            console.log('DICOM Viewer: Available tools:', {
              Wwwc: !!cornerstoneTools.WwwcTool,
              Pan: !!cornerstoneTools.PanTool,
              Zoom: !!cornerstoneTools.ZoomTool,
              Length: !!cornerstoneTools.LengthTool,
              Angle: !!cornerstoneTools.AngleTool,
              RectangleRoi: !!cornerstoneTools.RectangleRoiTool,
              EllipticalRoi: !!cornerstoneTools.EllipticalRoiTool,
              ArrowAnnotate: !!cornerstoneTools.ArrowAnnotateTool,
              TextMarker: !!cornerstoneTools.TextMarkerTool,
              FreehandRoi: !!cornerstoneTools.FreehandRoiTool,
              Probe: !!cornerstoneTools.ProbeTool
            });
            
            console.log('DICOM Viewer: Cornerstone tools initialized successfully');
          } catch (toolsError) {
            console.warn('DICOM Viewer: Tools initialization warning:', toolsError);
            // Continue without tools if initialization fails
          }
        }
        
        window.cornerstoneToolsInitialized = true;
        console.log('DICOM Viewer: Global initialization completed');
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
    if (isInitialized && viewportRef.current && images.length > 0) {
      loadImage();
    }
  }, [isInitialized, currentImageIndex, images]);

  const loadImage = async () => {
    if (!viewportRef.current) {
      console.warn('DICOM Viewer: No viewport reference available');
      return;
    }

    // Get current image URL
    const currentImageUrl = images[currentImageIndex];

    // Check if imageUrl is valid
    if (!currentImageUrl || typeof currentImageUrl !== 'string') {
      console.error('DICOM Viewer: Invalid or missing imageUrl:', currentImageUrl);
      setError('No image URL provided');
      setIsLoading(false);
      return;
    }

    console.log('DICOM Viewer: Starting image load', { currentImageUrl, isDICOM, currentImageIndex, totalImages: images.length });
    console.log('DICOM Viewer: Full imageUrl received:', currentImageUrl);
    setIsLoading(true);
    setError(null);

    try {
      let imageId: string;
      
      // Check if this is our API endpoint that needs authentication
      const needsAuth = currentImageUrl.includes('/api/') || currentImageUrl.includes(window.location.origin);
      
      if (needsAuth) {
        console.log('DICOM Viewer: URL needs authentication, loading manually');
        
        // Load the image data manually with authentication
        const token = localStorage.getItem('jwtToken');
        const response = await fetch(currentImageUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`File not found: The image file may have been moved or deleted`);
          } else if (response.status === 401) {
            throw new Error(`Authentication failed: Please log in again`);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        if (isDICOM) {
          imageId = `wadouri:${blobUrl}`;
          console.log('DICOM Viewer: Loading authenticated DICOM with imageId:', imageId);
        } else {
          imageId = blobUrl;
          console.log('DICOM Viewer: Loading authenticated image with imageId:', imageId);
        }
      } else {
        // External URL - use directly
        if (isDICOM) {
          const fullUrl = currentImageUrl.startsWith('http') ? currentImageUrl : `${window.location.origin}${currentImageUrl}`;
          imageId = `wadouri:${fullUrl}`;
          console.log('DICOM Viewer: Loading external DICOM with imageId:', imageId);
        } else {
          imageId = currentImageUrl.startsWith('http') ? currentImageUrl : `${window.location.origin}${currentImageUrl}`;
          console.log('DICOM Viewer: Loading external image with imageId:', imageId);
        }
      }

      console.log('DICOM Viewer: About to call cornerstone.loadImage with imageId:', imageId);
      const image = await cornerstone.loadImage(imageId);
      console.log('DICOM Viewer: Image loaded successfully', image);
      
      if (!viewportRef.current) {
        console.warn('DICOM Viewer: Viewport lost during image loading');
        setError('Viewport lost during loading');
        setIsLoading(false);
        return;
      }
      
      cornerstone.displayImage(viewportRef.current, image);
      setImageData(image);
      setIsLoading(false);

      // Set up tools
      setupTools();
      console.log('DICOM Viewer: Image display completed successfully');
    } catch (error) {
      console.error('DICOM Viewer: Error loading image:', error);
      
      // Try different loading strategies as fallbacks
      const fallbackStrategies = [];
      
      // Extract the file ID from the URL for alternative endpoints
      const fileIdMatch = currentImageUrl.match(/\/([a-f0-9-]{36})$/i);
      const fileId = fileIdMatch ? fileIdMatch[1] : null;
      
      if (String(error).includes('404') && fileId) {
        // For 404 errors, try alternative endpoints
        fallbackStrategies.push(
          { type: 'objects-uploads', imageId: `${window.location.origin}/api/objects/uploads/${fileId}` },
          { type: 'objects-local-upload', imageId: `${window.location.origin}/api/objects/local-upload/${fileId}` },
          { type: 'files-endpoint', imageId: `${window.location.origin}/api/files/${fileId}` }
        );
        console.log('DICOM Viewer: File not found, trying alternative endpoints');
      }
      
      if (isDICOM) {
        // If DICOM failed, try as regular image
        const regularUrl = currentImageUrl.startsWith('http') ? currentImageUrl : `${window.location.origin}${currentImageUrl}`;
        fallbackStrategies.push({ type: 'regular', imageId: regularUrl });
      } else {
        // If regular image failed, try different URL schemes
        if (!currentImageUrl.startsWith('http')) {
          fallbackStrategies.push({ type: 'absolute', imageId: `${window.location.origin}${currentImageUrl}` });
        }
        // Also try as DICOM if file extension suggests it
        if (currentImageUrl.toLowerCase().includes('.dcm') || currentImageUrl.toLowerCase().includes('.dicom')) {
          const dicomUrl = currentImageUrl.startsWith('http') ? currentImageUrl : `${window.location.origin}${currentImageUrl}`;
          fallbackStrategies.push({ type: 'dicom', imageId: `wadouri:${dicomUrl}` });
        }
      }
      
      // Try fallback strategies
      let fallbackSuccess = false;
      for (const strategy of fallbackStrategies) {
        try {
          console.log(`DICOM Viewer: Trying fallback loading as ${strategy.type} with imageId:`, strategy.imageId);
          if (!viewportRef.current) {
            console.warn('DICOM Viewer: Viewport lost during fallback loading');
            break;
          }
          
          let finalImageId = strategy.imageId;
          
          // If this is an API endpoint, load with authentication
          if (strategy.imageId.includes('/api/') || strategy.imageId.includes(window.location.origin)) {
            const token = localStorage.getItem('jwtToken');
            const response = await fetch(strategy.imageId, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            finalImageId = strategy.type.includes('dicom') ? `wadouri:${blobUrl}` : blobUrl;
          }
          
          const image = await cornerstone.loadImage(finalImageId);
          cornerstone.displayImage(viewportRef.current, image);
          setImageData(image);
          setIsLoading(false);
          setupTools();
          console.log(`DICOM Viewer: Fallback loading successful with ${strategy.type}`);
          fallbackSuccess = true;
          break;
        } catch (fallbackError) {
          console.warn(`DICOM Viewer: Fallback ${strategy.type} failed:`, fallbackError);
        }
      }
      
      if (!fallbackSuccess) {
        console.error('DICOM Viewer: All loading strategies failed');
        const errorMessage = error instanceof Error ? error.message : String(error);
        let userFriendlyMessage;
        
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          userFriendlyMessage = 'Image file not found. The file may have been moved or deleted from storage.';
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          userFriendlyMessage = 'Authentication failed. Please log in again.';
        } else if (errorMessage.includes('CORS')) {
          userFriendlyMessage = 'Image access blocked by security policy';
        } else {
          userFriendlyMessage = `Failed to load image: ${errorMessage}`;
        }
        
        setError(userFriendlyMessage);
        setIsLoading(false);
      }
    }
  };

  const setupTools = () => {
    if (!viewportRef.current) {
      console.warn('DICOM Viewer: No viewport available for tools setup');
      return;
    }

    // Check if cornerstoneTools is available
    if (!cornerstoneTools) {
      console.warn('DICOM Viewer: Cornerstone tools not available, skipping tools setup');
      return;
    }

    const element = viewportRef.current;

    try {
      // First add tools to this specific element using tool constructors
      const toolsToAdd = [
        { name: 'Wwwc', tool: cornerstoneTools.WwwcTool },
        { name: 'Pan', tool: cornerstoneTools.PanTool },
        { name: 'Zoom', tool: cornerstoneTools.ZoomTool },
        { name: 'Length', tool: cornerstoneTools.LengthTool },
        { name: 'Angle', tool: cornerstoneTools.AngleTool },
        { name: 'RectangleRoi', tool: cornerstoneTools.RectangleRoiTool },
        { name: 'EllipticalRoi', tool: cornerstoneTools.EllipticalRoiTool },
        { name: 'ArrowAnnotate', tool: cornerstoneTools.ArrowAnnotateTool },
        { name: 'TextMarker', tool: cornerstoneTools.TextMarkerTool },
        { name: 'FreehandRoi', tool: cornerstoneTools.FreehandRoiTool },
        { name: 'Probe', tool: cornerstoneTools.ProbeTool }
      ];

      // Add tools to element using addToolForElement with tool constructors
      toolsToAdd.forEach(({ name, tool }) => {
        try {
          if (tool && cornerstoneTools.addToolForElement) {
            cornerstoneTools.addToolForElement(element, tool);
            console.log(`DICOM Viewer: Added ${name} tool to element`);
          }
        } catch (toolError) {
          console.warn(`DICOM Viewer: Failed to add ${name} tool:`, toolError.message);
        }
      });

      // Set default tool modes using the correct tool names
      try {
        // Set primary tools active with the tool class names
        if (cornerstoneTools.setToolModeForElement) {
          cornerstoneTools.setToolModeForElement(element, 'WwwcTool', 'active', { mouseButtonMask: 1 });
          cornerstoneTools.setToolModeForElement(element, 'PanTool', 'active', { mouseButtonMask: 2 });
          cornerstoneTools.setToolModeForElement(element, 'ZoomTool', 'active', { mouseButtonMask: 4 });
          
          // Set measurement and annotation tools to passive
          ['LengthTool', 'AngleTool', 'RectangleRoiTool', 'EllipticalRoiTool', 'ArrowAnnotateTool', 'TextMarkerTool', 'FreehandRoiTool', 'ProbeTool'].forEach(toolName => {
            try {
              cornerstoneTools.setToolModeForElement(element, toolName, 'passive');
            } catch (e) {
              console.debug(`DICOM Viewer: Could not set ${toolName} to passive:`, e.message);
            }
          });
        } else if (cornerstoneTools.setToolActive) {
          // Try legacy API with simple names
          cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
          cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 2 });
          cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 4 });
        } else {
          console.warn('DICOM Viewer: No compatible tool setup method found');
          console.log('DICOM Viewer: Available cornerstoneTools methods:', Object.keys(cornerstoneTools));
          return;
        }
        
        console.log('DICOM Viewer: Tool modes set successfully');
      } catch (modeError) {
        console.warn('DICOM Viewer: Error setting tool modes:', modeError);
      }
      
      // Update active tool state
      setActiveTool('Wwwc');
      console.log('DICOM Viewer: Tools setup completed successfully');
    } catch (error) {
      console.warn('DICOM Viewer: Error setting up tools:', error);
      // Continue without tools if setup fails
    }
  };

  const activateTool = (toolName: string) => {
    if (!viewportRef.current) {
      console.warn('DICOM Viewer: No viewport available for tool activation');
      return;
    }

    // Check if cornerstoneTools is available with different API methods
    if (!cornerstoneTools) {
      console.warn('DICOM Viewer: Cornerstone tools not available, skipping tool activation');
      return;
    }

    try {
      const element = viewportRef.current;
      
      // Map UI tool names to actual cornerstone tool names
      const toolNameMap: Record<string, string> = {
        'Wwwc': 'WwwcTool',
        'Pan': 'PanTool', 
        'Zoom': 'ZoomTool',
        'Length': 'LengthTool',
        'Angle': 'AngleTool',
        'RectangleRoi': 'RectangleRoiTool',
        'EllipticalRoi': 'EllipticalRoiTool',
        'ArrowAnnotate': 'ArrowAnnotateTool',
        'TextMarker': 'TextMarkerTool',
        'FreehandRoi': 'FreehandRoiTool',
        'Probe': 'ProbeTool'
      };

      const actualToolName = toolNameMap[toolName] || toolName;
      const allToolNames = Object.values(toolNameMap);

      // Try different ways to set tool modes
      if (cornerstoneTools.setToolModeForElement) {
        // Deactivate all tools first
        allToolNames.forEach(tool => {
          try {
            cornerstoneTools.setToolModeForElement(element, tool, 'passive');
          } catch (toolError) {
            console.debug('DICOM Viewer: Tool passive warning for', tool, ':', toolError.message);
          }
        });

        // Activate selected tool
        cornerstoneTools.setToolModeForElement(element, actualToolName, 'active', { mouseButtonMask: 1 });
        console.log('DICOM Viewer: Tool activated:', actualToolName);
      } else if (cornerstoneTools.setToolActive) {
        // Try legacy API
        cornerstoneTools.setToolPassive(activeTool);
        cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
        console.log('DICOM Viewer: Tool activated (legacy):', toolName);
      } else {
        console.warn('DICOM Viewer: No compatible tool activation method found');
        console.log('DICOM Viewer: Available cornerstoneTools methods:', Object.keys(cornerstoneTools));
        return;
      }
      
      setActiveTool(toolName);
      
      // Add visual feedback that tool is activated
      if (viewportRef.current) {
        viewportRef.current.style.cursor = toolName === 'Pan' ? 'move' : 
                                          toolName === 'Zoom' ? 'zoom-in' :
                                          toolName === 'Length' || toolName === 'Angle' ? 'crosshair' :
                                          'default';
      }
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

  // Multi-image navigation functions
  const goToPreviousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const goToNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const goToFirstImage = () => {
    setCurrentImageIndex(0);
  };

  const goToLastImage = () => {
    setCurrentImageIndex(images.length - 1);
  };

  // Check if multi-image navigation should be shown
  const showMultiImageControls = images.length > 1;

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
              variant={activeTool === 'Angle' ? 'default' : 'ghost'}
              className="w-full p-2 text-white hover:bg-gray-700"
              onClick={() => activateTool('Angle')}
              data-testid="tool-angle"
            >
              <Triangle className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant={activeTool === 'Probe' ? 'default' : 'ghost'}
              className="w-full p-2 text-white hover:bg-gray-700"
              onClick={() => activateTool('Probe')}
              data-testid="tool-probe"
            >
              <Target className="w-4 h-4" />
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

            <Button
              size="sm"
              variant={activeTool === 'TextMarker' ? 'default' : 'ghost'}
              className="w-full p-2 text-white hover:bg-gray-700"
              onClick={() => activateTool('TextMarker')}
              data-testid="tool-text"
            >
              <Type className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant={activeTool === 'FreehandRoi' ? 'default' : 'ghost'}
              className="w-full p-2 text-white hover:bg-gray-700"
              onClick={() => activateTool('FreehandRoi')}
              data-testid="tool-freehand"
            >
              <PenTool className="w-4 h-4" />
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

                {/* Multi-image navigation controls */}
                {showMultiImageControls && (
                  <>
                    <Separator orientation="vertical" className="bg-gray-600 h-6" />
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={goToFirstImage}
                      disabled={currentImageIndex === 0}
                      className="text-white hover:bg-gray-700 disabled:opacity-50"
                      data-testid="button-first-image"
                      title="First Image"
                    >
                      <SkipBack className="w-4 h-4" />
                      <SkipBack className="w-4 h-4 -ml-2" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={goToPreviousImage}
                      disabled={currentImageIndex === 0}
                      className="text-white hover:bg-gray-700 disabled:opacity-50"
                      data-testid="button-prev-image"
                      title="Previous Image"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>

                    <span className="text-xs text-gray-400 px-2">
                      {currentImageIndex + 1} / {images.length}
                    </span>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={goToNextImage}
                      disabled={currentImageIndex === images.length - 1}
                      className="text-white hover:bg-gray-700 disabled:opacity-50"
                      data-testid="button-next-image"
                      title="Next Image"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={goToLastImage}
                      disabled={currentImageIndex === images.length - 1}
                      className="text-white hover:bg-gray-700 disabled:opacity-50"
                      data-testid="button-last-image"
                      title="Last Image"
                    >
                      <SkipForward className="w-4 h-4" />
                      <SkipForward className="w-4 h-4 -ml-2" />
                    </Button>
                  </>
                )}
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
                  {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-left bg-gray-900 p-2 rounded max-w-full overflow-auto">
                      <div><strong>Debug Info:</strong></div>
                      <div>URL: {imageUrl}</div>
                      <div>Is DICOM: {isDICOM ? 'Yes' : 'No'}</div>
                      <div>Cornerstone Available: {typeof cornerstone !== 'undefined' ? 'Yes' : 'No'}</div>
                    </div>
                  )}
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