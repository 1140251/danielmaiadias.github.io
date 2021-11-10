const path = require("path");
const prism = require("prismjs");
const marked = require("marked");
const emoji = require("node-emoji");
const matter = require("gray-matter");
const formatDate = require("date-fns/format");
const readingTime = require("reading-time");

// Support JSX syntax highlighting
require("prismjs/components/prism-jsx.min");

const EXCERPT_SEPARATOR = "<!-- more -->";
const renderer = new marked.Renderer();
const linkRenderer = renderer.link;
renderer.link = (href, title, text) => {
  const html = linkRenderer.call(renderer, href, title, text);

  if (href.indexOf("/") === 0) {
    // Do not open internal links on new tab
    return html;
  } else if (href.indexOf("#") === 0) {
    // Handle hash links to internal elements
    const html = linkRenderer.call(renderer, "javascript:;", title, text);
    return html.replace(
      /^<a /,
      `<a onclick="document.location.hash='${href.substr(1)}';" `
    );
  }

  return html.replace(/^<a /, '<a target="_blank" rel="nofollow" ');
};

renderer.code = (code, language) => {
  const parser = prism.languages[language] || prism.languages.html;
  const highlighted = prism.highlight(code, parser, language);
  return `<pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>`;
};

marked.setOptions({ renderer });

export default () => ({
  transform(md, id) {
    if (!/\.md$/.test(id)) return null;

    const fileName = path.basename(id);
    const { data, content: rawContent } = matter(md);
    const { title, date, description, tags } = data;

    const slug = fileName.split(".")[0];
    let content = rawContent;
    let excerpt = "";

    if (rawContent.indexOf(EXCERPT_SEPARATOR) !== -1) {
      const splittedContent = rawContent.split(EXCERPT_SEPARATOR);
      excerpt = splittedContent[0];
      content = splittedContent[1];
    }

    const replacer = (match) => emoji.emojify(match);
    content = content.replace(/(:.*:)/g, replacer);
    const html = marked(content);
    const readingStats = readingTime(content, { wordsPerMinute: 150 });
    const printReadingTime = readingStats.text;

    const exportFromModule = JSON.stringify({
      title,
      description,
      slug,
      html,
      date: date
        ? new Date(date).toLocaleDateString("en-EN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null,
      excerpt,
      tags: tags
        ? tags.split(",").map(function (item) {
            return item.trim();
          })
        : [],
      printReadingTime,
    });

    return {
      code: `export default ${exportFromModule}`,
      map: { mappings: "" },
    };
  },
});
