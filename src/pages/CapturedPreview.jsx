export default function CapturedPreview() {
  return (
    <iframe
      src="/captured.html"
      title="Captured Page Preview"
      sandbox="allow-same-origin"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block'
      }}
    />
  )
}
