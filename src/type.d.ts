declare module '*.obj' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const path: string;
  export default path;
}

declare const require: any;
