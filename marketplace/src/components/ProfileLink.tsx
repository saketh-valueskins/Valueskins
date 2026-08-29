'use client';

import { useRouter } from 'next/router';
import ProfilePreviewCard from './ProfilePreviewCard';
import { useProfilePreview } from '@/hooks/useProfilePreview';

interface ProfileLinkProps {
  type: 'creator' | 'brand';
  id: string | number;
  name: string;
  avatar?: string;
  followerCount?: number;
  engagementRate?: number;
  niche?: string;
  category?: string;
  dealsCount?: number;
  href: string;
  children?: React.ReactNode;
}

export default function ProfileLink({
  type,
  id,
  name,
  avatar,
  followerCount,
  engagementRate,
  niche,
  category,
  dealsCount,
  href,
  children,
}: ProfileLinkProps) {
  const router = useRouter();
  const { isOpen, position, handlers } = useProfilePreview();

  return (
    <>
      <span
        onClick={() => router.push(href)}
        {...handlers}
        style={{
          cursor: 'pointer',
          color: 'inherit',
          textDecoration: 'none',
          position: 'relative',
        }}
      >
        {children || name}
      </span>

      <ProfilePreviewCard
        type={type}
        id={id}
        name={name}
        avatar={avatar}
        followerCount={followerCount}
        engagementRate={engagementRate}
        niche={niche}
        category={category}
        dealsCount={dealsCount}
        isOpen={isOpen}
        position={position}
      />
    </>
  );
}
