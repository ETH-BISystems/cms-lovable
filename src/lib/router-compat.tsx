/**
 * react-router-dom v6 compatibility layer backed by TanStack Router.
 *
 * The production ETH Operations CMS uses react-router-dom v6. This mock runs
 * on Lovable's TanStack Start stack, so every routing primitive the
 * production code imports is re-implemented here with the v6 signature.
 * Production files only change their import source:
 *
 *     from '@/lib/router-compat'  →  from '@/lib/router-compat'
 *
 * All TanStack route-registry typing is intentionally erased (`as never`
 * casts) so module code compiles whether or not its target route file has
 * been registered yet.
 */

import * as React from 'react';
import {
  Link as TsLink,
  Outlet,
  useNavigate as useTsNavigate,
  useParams as useTsParams,
  useSearch as useTsSearch,
  useLocation as useTsLocation,
  useRouter,
} from '@tanstack/react-router';

export { Outlet };

export type To = string | { pathname?: string; search?: string; hash?: string };

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

function toToString(to: To): string {
  if (typeof to === 'string') return to;
  const pathname = to.pathname ?? '';
  const search = to.search
    ? to.search.startsWith('?')
      ? to.search
      : `?${to.search}`
    : '';
  const hash = to.hash ? (to.hash.startsWith('#') ? to.hash : `#${to.hash}`) : '';
  return `${pathname}${search}${hash}`;
}

/** Strips query/hash from a `to` for active-state matching. */
function pathOf(to: To): string {
  const s = toToString(to);
  return s.split('?')[0].split('#')[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Link
// ─────────────────────────────────────────────────────────────────────────────

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: To;
  replace?: boolean;
  state?: unknown;
  reloadDocument?: boolean;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state, reloadDocument, ...rest },
  ref,
) {
  return (
    <TsLink
      ref={ref}
      to={toToString(to) as never}
      replace={replace}
      state={state as never}
      reloadDocument={reloadDocument}
      {...rest}
    />
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// NavLink
// ─────────────────────────────────────────────────────────────────────────────

export interface NavLinkProps extends Omit<LinkProps, 'className' | 'style' | 'children'> {
  className?: string | ((props: { isActive: boolean; isPending: boolean }) => string | undefined);
  style?:
    | React.CSSProperties
    | ((props: { isActive: boolean; isPending: boolean }) => React.CSSProperties | undefined);
  children?: React.ReactNode | ((props: { isActive: boolean; isPending: boolean }) => React.ReactNode);
  /** Match only the exact path (v6 `end`). Default: prefix matching. */
  end?: boolean;
  caseSensitive?: boolean;
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, className, style, children, end = false, caseSensitive = false, ...rest },
  ref,
) {
  const { pathname } = useTsLocation();
  const target = pathOf(to);
  const current = caseSensitive ? pathname : pathname.toLowerCase();
  const wanted = caseSensitive ? target : target.toLowerCase();
  const isActive = end ? current === wanted : current === wanted || current.startsWith(`${wanted}/`);
  const state = { isActive, isPending: false };

  const resolvedClassName = typeof className === 'function' ? className(state) : className;
  const resolvedStyle = typeof style === 'function' ? style(state) : style;
  const resolvedChildren = typeof children === 'function' ? children(state) : children;

  return (
    <Link ref={ref} to={to} className={resolvedClassName} style={resolvedStyle} {...rest}>
      {resolvedChildren}
    </Link>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Navigate
// ─────────────────────────────────────────────────────────────────────────────

export function Navigate({ to, replace = false, state }: { to: To; replace?: boolean; state?: unknown }) {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(to, { replace, state });
  }, [navigate, to, replace, state]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

type V6Navigate = {
  (to: To, options?: NavigateOptions): void;
  (delta: number): void;
};

export function useNavigate(): V6Navigate {
  const tsNavigate = useTsNavigate();
  const router = useRouter();
  return React.useCallback<V6Navigate>(
    ((toOrDelta: To | number, options?: NavigateOptions) => {
      if (typeof toOrDelta === 'number') {
        router.history.go(toOrDelta);
        return;
      }
      tsNavigate({
        to: toToString(toOrDelta) as never,
        replace: options?.replace,
        state: options?.state as never,
      });
    }) as V6Navigate,
    [tsNavigate, router],
  );
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  // strict:false aggregates params from all matched routes, like v6.
  return useTsParams({ strict: false }) as T;
}

export interface Location<State = unknown> {
  pathname: string;
  search: string;
  hash: string;
  state: State;
  key: string;
}

export function useLocation<State = unknown>(): Location<State> {
  const location = useTsLocation() as {
    pathname: string;
    searchStr?: string;
    hash?: string;
    state?: unknown;
    key?: string;
  };
  const searchStr = location.searchStr ?? '';
  return {
    pathname: location.pathname,
    search: searchStr ? `?${searchStr}` : '',
    hash: location.hash ?? '',
    state: location.state as State,
    key: location.key ?? location.pathname,
  };
}

export function useSearchParams(): [
  URLSearchParams,
  (nextInit: URLSearchParams | Record<string, string | string[]>, opts?: NavigateOptions) => void,
] {
  const search = useTsSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  const params = React.useMemo(() => {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries(search)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => p.append(key, String(v)));
      } else if (typeof value === 'object') {
        p.set(key, JSON.stringify(value));
      } else {
        p.set(key, String(value));
      }
    }
    return p;
  }, [search]);

  const setParams = React.useCallback(
    (nextInit: URLSearchParams | Record<string, string | string[]>, opts?: NavigateOptions) => {
      const next =
        nextInit instanceof URLSearchParams
          ? Object.fromEntries(nextInit.entries())
          : (nextInit as Record<string, unknown>);
      navigate({ pathname: '.', search: new URLSearchParams(next as Record<string, string>).toString() }, opts);
    },
    [navigate],
  );

  return [params, setParams];
}

export function useMatch(pattern: string): { pathname: string } | null {
  const { pathname } = useTsLocation();
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2);
    return pathname === base || pathname.startsWith(`${base}/`) ? { pathname } : null;
  }
  return pathname === pattern ? { pathname } : null;
}

export function useHref(to: To): string {
  return toToString(to);
}
