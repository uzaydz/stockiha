import React, { useMemo } from 'react';
import { POSContentBlock } from './pos-content-data';

interface PaginatedProps {
    blocks: POSContentBlock[];
    maxPageWeight: number;
}

/*
  Smart Auto-Paginator
  Distributes content blocks into pages based on their 'weight'.
  This simulates "flowing" content from one page to another.
*/
export function useAutoPagination(blocks: POSContentBlock[], maxPageWeight = 100) {
    return useMemo(() => {
        const pages: React.ReactNode[][] = [];
        let currentPage: React.ReactNode[] = [];
        let currentWeight = 0;

        blocks.forEach((block, index) => {
            // Check if adding this block exceeds page limit
            if (currentWeight + block.weight > maxPageWeight && currentPage.length > 0) {
                // If the block is huge (larger than a full page), it will just take up a whole new page
                // Push current page to pages
                pages.push(currentPage);
                // Reset for new page
                currentPage = [];
                currentWeight = 0;
            }

            // Add block to current page
            currentPage.push(<React.Fragment key={block.id}>{block.component}</React.Fragment>);
            currentWeight += block.weight;
        });

        // Push the last page if it has content
        if (currentPage.length > 0) {
            pages.push(currentPage);
        }

        return pages;
    }, [blocks, maxPageWeight]);
}
