# CET-4/6 Preparation

四六级真题练习工作台。公开版：[GitHub Pages](https://jqk512.github.io/CET-4-6-Preparation/)。本地运行 `npm run dev`，打开 http://localhost:4173。

- 本地题库：24 套，1119 道客观题；四级、六级每套都含原卷写作与翻译题干。
- 网站提供在线做题和错题复盘，不提供资源下载页面。
- 答题进度、成绩和错题存于当前浏览器的 localStorage，可导出或导入备份。
- 原始 PDF/MP3 资料保留在本地 `local/library/`，不随网站发布。本地版从这里播放听力，在线版从原项目 GitHub Pages 播放听力。
- 需要重新同步资料时，运行 `python3 scripts/mirror_library.py`；在线版更新前运行 `python3 scripts/prepare_hosted.py`。

原始题库与资料索引来自 [Couldyyy9/cet-website](https://github.com/couldyyy9/cet-website)，其源代码基于 MIT 协议，完整文本见 [SOURCE-LICENSE](SOURCE-LICENSE)。真题、答案和音频版权归各自权利人，仅供个人学习使用。本站不提供官方等值分数；页面中的分数仅按原项目题型权重估算客观题得分。
