import React, { useCallback, useLayoutEffect, useRef } from 'react';

function makeBlankA5(): HTMLElement {
  const el = document.createElement('section');
  el.className = 'guide-page guide-page--full';
  el.setAttribute('dir', 'rtl');
  const inner = document.createElement('div');
  inner.style.width = '100%';
  inner.style.height = '100%';
  inner.style.background = '#ffffff';
  el.appendChild(inner);
  return el;
}

export function BookletImposer({
  enabled,
  sourceRef,
  layoutKey,
}: {
  enabled: boolean;
  sourceRef: React.RefObject<HTMLElement>;
  layoutKey: string;
}) {
  const imposedRef = useRef<HTMLDivElement | null>(null);

  const build = useCallback(() => {
    const source = sourceRef.current;
    const host = imposedRef.current;
    if (!enabled || !source || !host) return;

    host.innerHTML = '';

    // Only consider the original A5 pages that are direct children of the booklet container.
    // This prevents picking up previously-imposed clones inside `.guide-imposed`.
    const pageEls = Array.from(source.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement)
      .filter((el) => el.matches('section.guide-page'))
      .filter((el) => el.getAttribute('data-export-ignore') !== 'true');

    const front = pageEls.find((p) => p.getAttribute('data-guide-role') === 'front-cover') ?? pageEls[0];
    const back = pageEls.find((p) => p.getAttribute('data-guide-role') === 'back-cover') ?? pageEls[pageEls.length - 1];

    if (!front || !back || pageEls.length < 2) return;

    const interior = pageEls.filter((p) => p !== front && p !== back);

    const desiredTotal = Math.ceil((interior.length + 2) / 4) * 4;
    const blanksNeeded = desiredTotal - (interior.length + 2);

    const logical: HTMLElement[] = [front, ...interior];
    for (let i = 0; i < blanksNeeded; i++) logical.push(makeBlankA5());
    logical.push(back);

    const total = logical.length;
    const sheets = total / 4;

    const getClone = (pageNumber1Based: number) => {
      const node = logical[pageNumber1Based - 1] ?? makeBlankA5();
      return node.cloneNode(true) as HTMLElement;
    };

    for (let s = 0; s < sheets; s++) {
      const frontLeft = total - 2 * s;
      const frontRight = 1 + 2 * s;
      const backLeft = 2 + 2 * s;
      const backRight = total - (2 * s + 1);

      const makeA4 = (leftPage: number, rightPage: number) => {
        const a4 = document.createElement('div');
        a4.className = 'guide-a4-page';

        const left = document.createElement('div');
        left.className = 'guide-a4-slot';
        left.appendChild(getClone(leftPage));

        const right = document.createElement('div');
        right.className = 'guide-a4-slot';
        right.appendChild(getClone(rightPage));

        a4.appendChild(left);
        a4.appendChild(right);
        return a4;
      };

      host.appendChild(makeA4(frontLeft, frontRight));
      host.appendChild(makeA4(backLeft, backRight));
    }
  }, [enabled, sourceRef]);

  useLayoutEffect(() => {
    if (!enabled) return;
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => build());
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [enabled, build, layoutKey]);

  return <div className="guide-imposed" ref={imposedRef} />;
}
