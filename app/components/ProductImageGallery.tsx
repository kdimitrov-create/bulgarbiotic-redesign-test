import {useState, useCallback} from 'react';
import type {Image as ImageType} from '@cloudcart/nitro';
import {Image} from '@cloudcart/nitro-react';
import {ProductMarkBanners} from './ProductMarks';
import {cdnResize} from '~/lib/product-images';

/* Платформата връща адреси с width=1920 (~1.8 MB PNG на снимка), а галерията
   рисува ~700px, миниатюрите - 64px. Преоразмеряването е по конвенцията на
   къщата (PDP 700, swatch 160) + format=webp: една снимка 1867 KB → 28 KB. */
const resized = (img: ImageType, width: number): ImageType =>
  img?.url ? {...img, url: cdnResize(img.url, width)} : img;

export function ProductImageGallery({images, featuredImage, product}: {
  images: ImageType[];
  featuredImage: ImageType | null;
  /** Only used to draw the admin-configured banners over the main image. */
  product?: any;
}) {
  const allImages = images.filter((img) => img?.url).length > 0 ? images.filter((img) => img?.url) : featuredImage?.url ? [featuredImage] : [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = allImages[selectedIndex] ?? null;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSelectedIndex((i) => (i > 0 ? i - 1 : allImages.length - 1));
    } else if (e.key === 'ArrowRight') {
      setSelectedIndex((i) => (i < allImages.length - 1 ? i + 1 : 0));
    }
  }, [allImages.length]);

  if (!selectedImage) return <img src="/noimage.svg" alt="" className="w-full aspect-square object-contain bg-gray-100 rounded-xl" />;

  return (
    <div onKeyDown={allImages.length > 1 ? handleKeyDown : undefined}>
      <div className="relative [&_img]:w-full [&_img]:rounded-xl [&_img]:aspect-square [&_img]:object-cover [&_img]:bg-gray-100">
        <Image data={resized(selectedImage, 700)} alt={selectedImage.altText ?? ''} loading="eager" />
        {/* The trust marks ("клинично доказани щамове", the Forbes award) come
            from the admin panel, in the corner the merchant picked there. This
            used to be a hardcoded <img> — one of three copies that had already
            drifted apart across the site. */}
        {product ? <ProductMarkBanners product={product} size="lg" /> : null}
      </div>
      {allImages.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none" role="listbox" aria-label="Product images">
          {allImages.map((img, i) => (
            <button
              key={img.id ?? i}
              role="option"
              aria-selected={i === selectedIndex}
              className={`shrink-0 size-16 border-2 rounded-lg overflow-hidden cursor-pointer bg-transparent p-0 transition-[border-color] duration-150 [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_img]:rounded-md ${i === selectedIndex ? 'border-dark' : 'border-transparent hover:border-gray-400'}`}
              onClick={() => setSelectedIndex(i)}
              aria-label={img.altText || `Product image ${i + 1}`}
            >
              <Image data={resized(img, 160)} alt={img.altText ?? ''} width={80} height={80} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
