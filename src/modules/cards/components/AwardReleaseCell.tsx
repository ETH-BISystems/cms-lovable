import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AwardReleaseCellProps {
  awardReleaseDays: number | null;
  awardReleasePattern: string | null;
  verificationDate?: string;
  checkerIdentity?: string;
}

export function AwardReleaseCell({
  awardReleaseDays,
  awardReleasePattern,
  verificationDate,
  checkerIdentity,
}: AwardReleaseCellProps) {
  const content = (
    <div className="flex flex-col">
      {awardReleaseDays !== null ? (
        <span className="text-sm font-medium">{awardReleaseDays}d</span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )}
      {awardReleasePattern && (
        <span className="text-xs text-muted-foreground">{awardReleasePattern}</span>
      )}
    </div>
  );

  if (!awardReleaseDays) return content;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{content}</div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px]">
          <div className="space-y-1 text-xs">
            <p><span className="font-medium">Release window:</span> {awardReleaseDays} days in advance</p>
            {awardReleasePattern && <p><span className="font-medium">Pattern:</span> {awardReleasePattern}</p>}
            {verificationDate && <p><span className="font-medium">Verified:</span> {verificationDate}</p>}
            {checkerIdentity && <p><span className="font-medium">Checked by:</span> {checkerIdentity}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
