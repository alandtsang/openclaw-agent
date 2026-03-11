const pptxgen = require("pptxgenjs");
let pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
let slide = pres.addSlide();
slide.addText("Hello OpenClaw!", { x: 0.5, y: 0.5, fontSize: 36, color: "363636" });
pres.writeFile({ fileName: "output/test.pptx" }).then(() => {
  console.log("created test.pptx");
});
