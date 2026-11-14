import { createContentLoader } from 'vitepress'

export default createContentLoader('aws/*.md', {
    transform(data) {
        return data
            .filter(p => !p.url.endsWith('/aws/'))
            .sort((a, b) => {
                const da = new Date(a.frontmatter.date ?? 0).getTime()
                const db = new Date(b.frontmatter.date ?? 0).getTime()
                return db - da
            })
    },
})
