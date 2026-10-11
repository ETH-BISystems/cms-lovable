import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  PipelineProvider,
  ArticleDetailProvider,
  ArticleDetailPanelHost,
  ArticleDeepLinkHandler,
} from "@/modules/pipeline";

/**
 * Wraps /pipeline, /pipeline/refresh, /pipeline/content-library, /calendar
 * and /rss in the shared pipeline providers — mirrors the production App.tsx
 * route group: the calendar and RSS pages open the pipeline article detail
 * panel through these contexts.
 */
export const Route = createFileRoute("/_app/_pp")({
  component: PipelineProvidersLayout,
});

function PipelineProvidersLayout() {
  return (
    <PipelineProvider>
      <ArticleDetailProvider>
        <ArticleDeepLinkHandler />
        <Outlet />
        <ArticleDetailPanelHost />
      </ArticleDetailProvider>
    </PipelineProvider>
  );
}
