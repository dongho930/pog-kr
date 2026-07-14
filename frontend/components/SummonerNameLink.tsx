"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

function summonerHref(gameName: string, tagLine: string): string {
  return `/summoners/kr/${encodeURIComponent(gameName)}-${encodeURIComponent(tagLine)}`;
}

/**
 * 매치 참가자 닉네임 링크. game_name/tag_line이 매치 기록에 그대로 있으면
 * 바로 링크를 걸고, 태그가 비어 있으면(오래된 매치는 Riot API가
 * riotIdTagLine을 안 준 경우가 있음) 클릭 시 puuid로 현재 Riot ID를
 * 역조회해서 이동한다.
 */
export function SummonerNameLink({
  puuid,
  gameName,
  tagLine,
  className,
  stopPropagation = false,
  children,
}: {
  puuid: string;
  gameName: string;
  tagLine: string;
  className?: string;
  stopPropagation?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [resolving, setResolving] = useState(false);

  if (gameName && tagLine) {
    return (
      <Link
        href={summonerHref(gameName, tagLine)}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
        }}
        className={className}
      >
        {children}
      </Link>
    );
  }

  async function handleClick(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation();
    if (resolving) return;
    setResolving(true);
    try {
      const resolved = await api.resolveRiotIdByPuuid(puuid);
      router.push(summonerHref(resolved.game_name, resolved.tag_line));
    } catch {
      // 역조회 실패 시(탈퇴 계정 등) 별도 처리 없이 그대로 둔다.
    } finally {
      setResolving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${className ?? ""} cursor-pointer text-left disabled:cursor-wait disabled:opacity-60`}
      disabled={resolving}
    >
      {children}
      {resolving && "..."}
    </button>
  );
}
