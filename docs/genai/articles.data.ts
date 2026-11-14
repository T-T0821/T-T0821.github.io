import { createContentLoader } from 'vitepress'

export default createContentLoader('genai/*.md', {
    transform(data) {
        return data
            .filter(p => !p.url.endsWith('/genai/'))
            .sort((a, b) => {
                const da = new Date(a.frontmatter.date ?? 0).getTime()
                const db = new Date(b.frontmatter.date ?? 0).getTime()
                return db - da
            })
    },
})
