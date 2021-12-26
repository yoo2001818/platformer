declare module '*.obj' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const path: string;
  export default path;
}

declare module '*.svg' {
  import {ComponentType, SVGAttributes} from 'react';

  const component: ComponentType<SVGAttributes>;
  export default component;
}

declare const require: any;
