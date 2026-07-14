const SKILLS = ["Q", "W", "E", "R"] as const;

export function SkillBuildGrid({ fullSkillOrder }: { fullSkillOrder?: (string | null)[] }) {
  const order = fullSkillOrder ?? [];
  const hasData = order.some((s) => s !== null);
  if (!hasData) {
    return <p className="text-sm text-text-muted">데이터가 부족합니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid grid-cols-[2rem_repeat(18,1.75rem)] gap-1">
        {SKILLS.map((skill) => (
          <div key={skill} className="contents">
            <div className="flex items-center justify-center font-display text-sm font-bold text-accent-gold">
              {skill}
            </div>
            {order.map((chosen, levelIdx) => {
              const level = levelIdx + 1;
              const isThisSkill = chosen === skill;
              return (
                <div
                  key={levelIdx}
                  className={`flex h-7 items-center justify-center rounded text-xs font-semibold ${
                    isThisSkill
                      ? "bg-accent-gold text-[#171207]"
                      : "bg-base-elevated text-transparent"
                  }`}
                >
                  {isThisSkill ? level : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
