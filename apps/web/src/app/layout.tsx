export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#09090b', color: '#fafafa' }}>{children}</body>
    </html>
  );
}