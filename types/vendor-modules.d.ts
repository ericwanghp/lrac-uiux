declare module "turndown" {
  class TurndownService {
    constructor(options?: {
      headingStyle?: "setext" | "atx";
      hr?: string;
      bulletListMarker?: "-" | "*" | "+";
      codeBlockStyle?: "indented" | "fenced";
      emDelimiter?: "_" | "*";
      strongDelimiter?: "__" | "**";
      linkStyle?: "inlined" | "referenced";
      linkReferenceStyle?: "full" | "collapsed" | "shortcut";
    });
    turndown(input: string): string;
    use(plugin: unknown): void;
  }
  export default TurndownService;
}

declare module "turndown-plugin-gfm" {
  export const gfm: unknown;
}
