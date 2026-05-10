/// <reference types="vite/client" />

// Untuk import CSS
declare module '*.css' {
  const content: string;
  export default content;
}

// Optional: kalau pakai SVG atau asset lain
declare module '*.svg' {
  import * as React from 'react';
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}