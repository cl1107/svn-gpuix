import AppKit

private let canvasSize: CGFloat = 1024
private let accent = NSColor(
    calibratedRed: 0x33 / 255.0,
    green: 0x63 / 255.0,
    blue: 0xF2 / 255.0,
    alpha: 1
)

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data("[render-app-icon] \(message)\n".utf8))
    exit(1)
}

guard CommandLine.arguments.count == 2 else {
    fail("usage: swift scripts/render-app-icon.swift <output.png>")
}

let outputURL = URL(fileURLWithPath: CommandLine.arguments[1])

guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(canvasSize),
    pixelsHigh: Int(canvasSize),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    fail("could not create bitmap")
}

guard let graphics = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fail("could not create graphics context")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = graphics

guard let context = NSGraphicsContext.current?.cgContext else {
    fail("could not access CGContext")
}

context.setAllowsAntialiasing(true)
context.setShouldAntialias(true)
context.clear(CGRect(x: 0, y: 0, width: canvasSize, height: canvasSize))

// Draw in the SVG's top-left coordinate system so this raster stays identical
// to assets/app-icon.svg, which is the canonical editable design source.
context.translateBy(x: 0, y: canvasSize)
context.scaleBy(x: 1, y: -1)

accent.setFill()
NSBezierPath(
    roundedRect: NSRect(x: 64, y: 64, width: 896, height: 896),
    xRadius: 216,
    yRadius: 216
).fill()

context.saveGState()
context.translateBy(x: 70, y: 85)
context.scaleBy(x: 1.6, y: 1.6)

let bowl = NSBezierPath()
bowl.move(to: NSPoint(x: 135, y: 405))
bowl.line(to: NSPoint(x: 135, y: 110))
bowl.line(to: NSPoint(x: 275, y: 110))
bowl.curve(
    to: NSPoint(x: 400, y: 213),
    controlPoint1: NSPoint(x: 350, y: 110),
    controlPoint2: NSPoint(x: 400, y: 148)
)
bowl.curve(
    to: NSPoint(x: 275, y: 316),
    controlPoint1: NSPoint(x: 400, y: 278),
    controlPoint2: NSPoint(x: 350, y: 316)
)
bowl.line(to: NSPoint(x: 135, y: 316))

let leg = NSBezierPath()
leg.move(to: NSPoint(x: 274, y: 316))
leg.line(to: NSPoint(x: 405, y: 430))

for path in [bowl, leg] {
    path.lineWidth = 54
    path.lineCapStyle = .round
    path.lineJoinStyle = .round
    NSColor.white.setStroke()
    path.stroke()
}

accent.setFill()
for point in [
    NSPoint(x: 135, y: 110),
    NSPoint(x: 274, y: 316),
    NSPoint(x: 405, y: 430),
] {
    NSBezierPath(
        ovalIn: NSRect(x: point.x - 14, y: point.y - 14, width: 28, height: 28)
    ).fill()
}

context.restoreGState()
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fail("could not encode PNG")
}

do {
    try png.write(to: outputURL, options: .atomic)
} catch {
    fail("could not write \(outputURL.path): \(error)")
}
