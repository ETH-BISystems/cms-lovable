import { useEffect } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { useArticleDetailContext } from '../context/ArticleDetailContext';

/**
 * CMS-95 — deep-link into the Article pipeline: any route inside the pipeline
 * provider group (e.g. /pipeline?article={id}) opens that article's detail
 * panel automatically. Used by the iFrame Manager's "Embedded in" badges.
 *
 * The param is consumed (removed from the URL) once handled so a later
 * close/re-open of the panel isn't fighting the location state.
 */
export function ArticleDeepLinkHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openPanel } = useArticleDetailContext();
  const articleId = searchParams.get('article');

  useEffect(() => {
    if (!articleId) return;
    openPanel(articleId);
    const next = new URLSearchParams(searchParams);
    next.delete('article');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  return null;
}
