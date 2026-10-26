import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import appCss from '../styles.css?url'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { name: 'referrer', content: 'no-referrer' }, // keep token-bearing URLs out of Referer
      { title: 'Heritage - Member Management Console' },
      {
        name: 'description',
        content:
          'Heritage of Faith International Church — Member Management Console for visitor intake, attendance, directory, and follow-up coordination',
      },
      { name: 'author', content: 'Heritage MM Console' },
      { property: 'og:title', content: 'Heritage - Member Management Console' },
      {
        property: 'og:description',
        content:
          'Complete church membership and visitor management system with attendance tracking, directory, and follow-up coordination',
      },
      { property: 'og:type', content: 'website' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
        <Scripts />
      </body>
    </html>
  )
}
