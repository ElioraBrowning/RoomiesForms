export function BrandImage({
  light,
  dark,
  alt,
  className = '',
  width,
  height,
}: {
  light: string;
  dark: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}) {
  if (light === dark) {
    return <img className={className} src={light} alt={alt} width={width} height={height} />;
  }
  return (
    <>
      <img className={`${className} theme-light-only`} src={light} alt={alt} width={width} height={height} />
      <img className={`${className} theme-dark-only`} src={dark} alt="" aria-hidden="true" width={width} height={height} />
    </>
  );
}
