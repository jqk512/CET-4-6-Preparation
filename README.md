# CET-4/6 Preparation

四六级真题练习工作台。公开版：[GitHub Pages](https://jqk512.github.io/CET-4-6-Preparation/)。本地运行 `npm run dev`，打开 http://localhost:4173。

- 题库：44 套，2070 道客观题；四级、六级每套都含原卷写作与翻译题干。
- 网站提供在线做题和错题复盘，不提供资源下载页面。
- 答题进度、成绩和错题存于当前浏览器的 localStorage，可导出或导入备份。
- 原始 PDF/MP3 资料保留在本地 `local/library/`。新增试卷的听力音频由 Sites 托管，GitHub Pages 从该站点播放。2023 年 3 月六级原资料只有一套客观题，另外两套只有写作和翻译原题；2023 年 6 月及 12 月四级、2023 年 6 月及 12 月六级、2026 年 6 月四级和六级的第三套仅含独立阅读、写作及翻译题。其余已上线试卷的听力仍从原项目 GitHub Pages 播放。
- 需要重新同步资料时，运行 `python3 scripts/mirror_library.py`；在线版更新前运行 `python3 scripts/prepare_hosted.py`。

原始题库与资料索引来自 [Couldyyy9/cet-website](https://github.com/couldyyy9/cet-website)，其源代码基于 MIT 协议，完整文本见 [SOURCE-LICENSE](SOURCE-LICENSE)。真题、答案和音频版权归各自权利人，仅供个人学习使用。本站不提供官方等值分数；页面中的分数仅按原项目题型权重估算客观题得分。
