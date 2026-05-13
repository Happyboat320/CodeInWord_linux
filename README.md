# CodeInWord Linux

本地离线代码高亮工具。浏览器页面适合人工复制到 WPS / LibreOffice，`cli.js` 适合本地 agent 通过输入输出调用。

本项目为 https://www.codeinword.com/ 的复刻，设计基本保持了一致。主要为了解决linux下可能存在的不兼容和方便编程agent工具自动化使用的问题。

手动使用网页版：https://happyboat.site/codeinword_linux

也可以下载后部署在本地：

## 浏览器使用

```bash
python3 -m http.server 8000
```

打开：

```text
http://127.0.0.1:8000/
```

## Agent / 命令行使用

从 stdin 传入代码，stdout 输出可粘贴到文档软件的 HTML 片段：

```bash
node cli.js --language python < input.py > output.html
```

从文件读写：

```bash
node cli.js --language javascript --input app.js --output code.html
```

常用参数：

```text
--language, -l       语言，例如 python/javascript/cpp/bash/sql/xml/css/json/yaml
--theme, -t          light 或 dark
--font-size          字号，例如 12px、14px
--no-line-numbers    不输出行号
--full-document      输出完整 HTML 文档，而不是片段
```
