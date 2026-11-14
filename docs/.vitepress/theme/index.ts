import DefaultTheme from 'vitepress/theme'
import type { EnhanceAppContext } from 'vitepress'
import ArticleList from './ArticleList.vue'
import HomeDashboard from './HomeDashboard.vue'
import './custom.css'

export default {
    extends: DefaultTheme,
    enhanceApp({ app }: EnhanceAppContext) {
        app.component('ArticleList', ArticleList)
        app.component('HomeDashboard', HomeDashboard)
    },
}
