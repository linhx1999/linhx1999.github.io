---
title: 使用Markdown和XML构建提示词
slug: Construct-Prompt-with-Markdown-and-XML
pubDatetime: 2025-08-03
description:
  提示词工程
featured: false
draft: false
tags:
  - LLM
  - Prompt Engineering
---


# 参考资料

- [Claude提示工程](https://docs.anthropic.com/zh-CN/docs/build-with-claude/prompt-engineering/overview)
- [OpenAI提示工程](https://platform.openai.com/docs/guides/prompt-engineering)
- [ChatGLM指令工程方法与实践](https://www.bilibili.com/video/BV1fw4m1k7Ea/?spm_id_from=333.1365.top_right_bar_window_custom_collection.content.click&vd_source=6e29cbb374a8b5e5f6affc7894de614a)
- [Deepseek官方使用指南](https://github.com/deepseek-ai/DeepSeek-R1?tab=readme-ov-file#usage-recommendations)


# 提示词

提示是向大（语言）模型提供输入的过程。模型输出的质量通常取决于如何有效地提示模型。

“prompt”（提示词）指的是**输入给模型的一段文本或指令**，这段文本或指令旨在引导模型生成特定类型的响应或执行特定任务。
其目的是为了给模型提供上下文信息，帮助模型更好地理解用户的意图，并据此生成相关且有用的输出。

提示词的效果会受到多个因素的影响，包括但不限于**大语言模型的版本、应用场景、输入数据的长度以及标记变量的方式**等。
尽管提示词的写法会影响LLM的输出结果，但有一些技巧在多个模型中是通用的。


# 什么是 Markdown 格式？

**Markdown** 是一种轻量级的标记语言，它通过简单的符号（如 `#`、`*`、`-` 等）对文本进行格式化，
最终可以转换为 HTML、PDF 或其他富文本格式。它的设计目标是让文本内容**易读易写**，同时保持纯文本的简洁性。

```markdown
# 一级标题

## 二级标题
- 列表项 1
- 列表项 2
```

# 什么是XML？

可扩展标记语言（英语：Extensible Markup Language，简称：XML）是一种标记语言和用于存储、传输和重构松散数据的文件格式。它定义了一系列编码文档的规则以使其在人类可读的同时机器可读。


# 为什么要用 Markdown 和 XML 编写大语言模型提示词？

- 使用Markdown格式和XML标签的组合，能帮助大语言模型更准确地理解提示词的逻辑结构和上下文边界。
- **Markdown的优势：**
    - 通过标题、分段、列表、代码块（\`\`\` \`\`\`）等结构化元素，清晰划分内容，突出重点，并有效区分提示词与长文本、表格、代码等元素，避免模型混淆。
    - 提升提示词的可读性，便于开发、维护、调试、团队协作及版本管理（如将提示词写入.md文件中，方便编辑器渲染）。
    - 结构化的提示词模板（如角色设定、任务描述、示例）更易于复用。
    - 从直觉上看，多数大语言模型默认以Markdown格式输出，因此使用Markdown格式的提示词有助于提高输出质量。
- **XML标签的优势：**
    - 明确界定提示中不同组件（如指令、示例、上下文）的开始与结束，例如使用诸如`<instructions>`、`<example>`之类的标签，构建清晰的提示词结构，从而帮助模型更准确地解析，产生更高质量的输出。
    - XML属性还可用于定义内容的元数据，方便指令引用。


# 一些样例

## 简单示例

```markdown
# 电商产品评论情感分析

## 任务描述

分析用户评论的情感倾向（正面/负面）。

## 示例

Input: "这款手机性价比超高，但电池续航太差了。"
Output: "中性"
```

## [OpenAI官方样例](https://platform.openai.com/docs/guides/prompt-engineering?prompt-example=prompt#message-formatting-with-markdown-and-xml)

```md
# Identity

You are coding assistant that helps enforce the use of snake case 
variables in JavaScript code, and writing code that will run in 
Internet Explorer version 6.

# Instructions

* When defining variables, use snake case names (e.g. my_variable) 
  instead of camel case names (e.g. myVariable).
* To support old browsers, declare variables using the older 
  "var" keyword.
* Do not give responses with Markdown formatting, just return 
  the code as requested.

# Examples

<user_query>
How do I declare a string variable for a first name?
</user_query>

<assistant_response>
var first_name = "Anna";
</assistant_response>
```

## [Claude官方样例](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags#example-generating-financial-reports)

```md
You’re a financial analyst at AcmeCorp. Generate a Q2 financial report for our investors.

AcmeCorp is a B2B SaaS company. Our investors value transparency and actionable insights.

Use this data for your report:<data>{{SPREADSHEET_DATA}}</data>

<instructions>
1. Include sections: Revenue Growth, Profit Margins, Cash Flow.
2. Highlight strengths and areas for improvement.
</instructions>

Make your tone concise and professional. Follow this structure:
<formatting_example>{{Q1_REPORT}}</formatting_example>
```


## 一些常用的XML标签使用样例

```xml
<!-- few shots标签 -->
<examples>
{examples}
</examples>


<!-- 数据变量标签，可以为任意变量 -->
使用这些data进行报告：
<data>
{{SPREADSHEET_DATA}}
</data>


<!-- 指示标签，常在指示中使用其他数据变量标签 -->
Use the following step-by-step instructions to respond to user inputs.
<instructions>
1. 分析以下条款：
- 赔偿
- 责任限制
- 知识产权所有权
2. 注意不寻常或令人担忧的条款。
3. 与我们的标准合同进行比较。
4. 在<findings>标签中总结调查结果。
5. 在<recommendations>标签中列出可行的建议。
</instructions>


<!-- 格式标签 -->
输出遵循这种structure：
<formatting_example>
{{Q1_REPORT}}
</formatting_example>


<!-- cot标签的使用 -->
在...之前先在 <thinki></thinki> 标签中思考。首先，...。然后，...。最后，在 <answer></answer> 标签中使用你的分析回答问题...。

<!-- R1技术报告中的DeepSeek-R1-Zero训练模板 -->
A conversation between User and Assistant. The user asks a question, and the Assistant solves it. The assistant first thinks about the reasoning process in the mind and then provides the user with the answer. The reasoning process and answer are enclosed within <think> </think> and <answer> </answer> tags, respectively, i.e., <think> reasoning process here </think> <answer> answer here </answer>. User: prompt. Assistant:


<!-- 多文档标签 -->
<!-- 通常将长文档放在提示词顶部，可以提高模型输出效果 -->
您是一位AI医生助手。您的任务是帮助医生诊断可能的患者疾病。
<documents>
  <document index="1">
    <source>患者症状.txt</source>
    <document_content>
      {{ 患者症状 }}
    </document_content>
  </document>
  <document index="2">
    <source>患者病历.txt</source>
    <document_content>
      {{ 患者病历 }}
    </document_content>
  </document>
  <document index="3">
    <source>患者01_就诊历史.txt</source>
    <document_content>
      {{ 患者01_就诊历史 }}
    </document_content>
  </document>
</documents>
从患者病历和就诊历史中找出与诊断患者报告症状相关的引用。将这些引用放在<quotes>标签中。然后，根据这些引用，列出所有有助于医生诊断患者症状的信息。将您的诊断信息放在<info>标签中。
```
