import React, { useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

interface MathTextProps {
  content: string;
  fontSize?: number;
  color?: string;
}

// $ işaretleri arasındaki LaTeX ifadelerini KaTeX ile render eden basit HTML sarmalayıcı.
// WebView içerikleri otomatik boyutlandırmıyor, bu yüzden yükseklik JS ile ölçülüp geri gönderiliyor.
function buildHtml(content: string, fontSize: number, color: string) {
  const escaped = content.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "$");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: transparent;
      color: ${color};
      font-family: -apple-system, sans-serif;
      font-size: ${fontSize}px;
      line-height: 1.5;
      padding: 0;
    }
    .katex { font-size: 1.05em; }
  </style>
</head>
<body>
  <div id="content"></div>
  <script>
    document.getElementById('content').textContent = \`${escaped}\`;
    function renderAndMeasure() {
      try {
        renderMathInElement(document.getElementById('content'), {
          delimiters: [{left: '$', right: '$', display: false}],
          throwOnError: false
        });
      } catch (e) {}
      const height = document.body.scrollHeight;
      window.ReactNativeWebView.postMessage(String(height));
    }
    if (window.renderMathInElement) {
      renderAndMeasure();
    } else {
      window.onload = renderAndMeasure;
      setTimeout(renderAndMeasure, 600);
    }
  </script>
</body>
</html>`;
}

export default function MathText({ content, fontSize = 15, color = "#eee" }: MathTextProps) {
  const [height, setHeight] = useState(30);
  const webviewRef = useRef<WebView>(null);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: buildHtml(content, fontSize, color) }}
        onMessage={(event) => {
          const h = parseInt(event.nativeEvent.data, 10);
          if (!isNaN(h) && h > 0) setHeight(h);
        }}
        scrollEnabled={false}
        style={styles.webview}
        javaScriptEnabled
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", backgroundColor: "transparent" },
  webview: { backgroundColor: "transparent" },
});
