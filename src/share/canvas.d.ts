declare module "canvas" {
  export function createCanvas(
    width: number,
    height: number,
  ): {
    width: number;
    height: number;
    getContext(
      contextId: "2d",
    ): {
      fillStyle: string;
      strokeStyle: string;
      lineWidth: number;
      font: string;
      fillRect(x: number, y: number, w: number, h: number): void;
      fillText(text: string, x: number, y: number): void;
      beginPath(): void;
      moveTo(x: number, y: number): void;
      lineTo(x: number, y: number): void;
      stroke(): void;
      clearRect(x: number, y: number, w: number, h: number): void;
    };
    toBuffer(mimeType: "image/png"): Buffer;
  };
}
