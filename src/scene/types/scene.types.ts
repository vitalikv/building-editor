export interface SceneOptions {
  backgroundColor?: number;
  cameraOptions?: CameraOptions;
  rendererOptions?: RendererOptions;
  onReady?: () => void;
}

export interface CameraOptions {
  fov?: number;
  aspect?: number;
  near?: number;
  far?: number;
  position?: { x: number; y: number; z: number };
}

export interface GridOptions {
  size?: number;
  divisions?: number;
  colorCenterLine?: number;
  colorGrid?: number;
  visible?: boolean;
}

/**
 * JSDoc Настройки рендерера с расширенными параметрами Three.js
 * @property {boolean} [antialias=true] - Включить сглаживание
 * @property {number} [pixelRatio=window.devicePixelRatio] - Пиксельное соотношение
 */
export interface RendererOptions {
  antialias?: boolean;
  pixelRatio?: number;
  alpha?: boolean;
  preserveDrawingBuffer?: boolean;
}

// Дополнительные типы, которые могут понадобиться
export type DisposeCallback = () => void;
export type SceneEvent = 'init' | 'dispose' | 'resize';
