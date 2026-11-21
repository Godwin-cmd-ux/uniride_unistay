import Link from 'next/link';
import type { PropertySummary } from '@/lib/types';
import { distanceLabel, mediaUrl, propertyTypeLabels, tzs } from '@/lib/format';
import { Icon } from './Icon';

export function PropertyCard({ property }: { property: PropertySummary }) {
  const image = mediaUrl(property.imageUrl);
  return (
    <Link href={`/stays/${property.id}`} className="property-card">
      <div className={`property-image ${image ? '' : 'property-image-fallback'}`}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={property.name} loading="lazy" />
        ) : (
          <span className="property-image-glyph">
            <Icon name="bed" size={32} />
          </span>
        )}
        <div className="property-badges">
          <span className="badge badge-glass">{propertyTypeLabels[property.type]}</span>
          {property.verifiedAt && (
            <span className="badge badge-verified">
              <Icon name="shield" size={12} /> Verified
            </span>
          )}
        </div>
        <span className="property-price-tag">
          {tzs(property.priceFrom)}
          <small>/month</small>
        </span>
      </div>
      <div className="property-body">
        <div className="property-campus">
          <span>{property.universityShortName}</span>
          <span className="dot" />
          <span>{distanceLabel(property.distanceM)}</span>
        </div>
        <h3>{property.name}</h3>
        <p className="property-area">
          <Icon name="pin" size={14} /> {property.addressArea}
        </p>
        <div className="property-foot">
          <span className="property-units">
            <Icon name="key" size={14} /> {property.availableUnits} unit
            {property.availableUnits === 1 ? '' : 's'} open
          </span>
          <span className="link-arrow">
            View stay <Icon name="arrow-right" size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
