import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function workspaceHrefFromPath(raw: string): string | null {
  const value = raw.trim().replace(/\\/g, '/')
  if (!value || /\s/.test(value)) return null

  let path = value
  if (path.startsWith('/workspace/')) path = path.slice('/workspace/'.length)
  else if (path.startsWith('workspace/')) path = path.slice('workspace/'.length)
  else if (path.includes('/workspace/')) path = path.slice(path.lastIndexOf('/workspace/') + '/workspace/'.length)
  else if (!path.includes('/')) return null

  if (!/\.[a-z0-9]{1,12}$/i.test(path)) return null

  const encoded = path
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')

  return encoded ? `/workspace/${encoded}` : null
}

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children, ...props }) {
            return (
              <a href={href} target="_blank" rel="noreferrer" {...props}>
                {children}
              </a>
            )
          },
          code({ inline, children, className, ...props }: any) {
            const text = String(children ?? '').replace(/\n$/, '')
            const href = inline ? workspaceHrefFromPath(text) : null
            if (href) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={className}
                  title="Open in Workspace"
                >
                  {children}
                </a>
              )
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
