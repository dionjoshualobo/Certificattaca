export interface CanvasBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const drawTextInBox = (
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  box: CanvasBox
): void => {
  const MIN_FONT_SIZE = 8;
  const FILL_RATIO = 0.92;

  const measure = (fontSize: number) => {
    ctx.font = `${fontSize}px "${fontFamily}", Arial, sans-serif`;
    return ctx.measureText(text);
  };

  let fontSize = Math.max(MIN_FONT_SIZE, box.height * FILL_RATIO);
  let measured = measure(fontSize);

  const glyphHeight = measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent;
  const fitScale = Math.min(
    measured.width > 0 ? (box.width * FILL_RATIO) / measured.width : 1,
    glyphHeight > 0 ? (box.height * FILL_RATIO) / glyphHeight : 1
  );

  if (fitScale < 1) {
    fontSize = Math.max(MIN_FONT_SIZE, fontSize * fitScale);
    measured = measure(fontSize);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const centerY = box.y + box.height / 2;
  ctx.fillText(
    text,
    box.x + box.width / 2,
    centerY + (measured.actualBoundingBoxAscent - measured.actualBoundingBoxDescent) / 2
  );
};