import DefaultTheme from 'vitepress/theme'
import type { EnhanceAppContext } from 'vitepress'
import ArticleCards from './ArticleCards.vue'
import './custom.css'

export default {
    extends: DefaultTheme,
    enhanceApp({ app }: EnhanceAppContext) {
        app.component('ArticleCards', ArticleCards)
    },
}
