import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { format, addDays, differenceInDays, isWeekend } from 'date-fns';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, ZoomIn, ZoomOut, Calendar } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
export interface GanttTask {
  id: string;
  parentId?: string | null;
  name: string;
  wbsCode?: string;
  level: number;
  status: string;
  priority: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  isMilestone: boolean;
  hasChildren: boolean;
  assigneeName?: string;
  sortOrder: number;
  dependencies: { predecessorId: string; dependencyType: string; lagDays: number }[];
  isCritical: boolean;
}

interface GanttChartProps {
  tasks: GanttTask[];
  projectStart: string;
  projectEnd: string;
  readOnly?: boolean;
}

type ZoomLevel = 'day' | 'week' | 'month';

const ROW_HEIGHT    = 40;
const LABEL_WIDTH   = 320;
const HEADER_HEIGHT = 56;

const STATUS_COLORS: Record<string, string> = {
  NotStarted: '#9CA3AF', InProgress: '#3B82F6',
  Completed: '#22C55E', OnHold: '#F59E0B', Cancelled: '#EF4444',
};
const PRIORITY_BORDER: Record<string, string> = {
  Low: '#86EFAC', Medium: '#FDE68A', High: '#FCA5A5', Critical: '#F87171',
};

export default function GanttChart({ tasks, projectStart, projectEnd, readOnly = false }: GanttChartProps) {
  const [zoom, setZoom]             = useState<ZoomLevel>('week');
  const [collapsed, setCollapsed]   = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const labelsRef  = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  // Synchronize vertical scroll between label column and chart area
  useEffect(() => {
    const chart  = scrollRef.current;
    const labels = labelsRef.current;
    if (!chart || !labels) return;

    const onChartScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      labels.scrollTop = chart.scrollTop;
      syncingRef.current = false;
    };
    const onLabelsScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      chart.scrollTop = labels.scrollTop;
      syncingRef.current = false;
    };

    chart.addEventListener('scroll', onChartScroll);
    labels.addEventListener('scroll', onLabelsScroll);
    return () => {
      chart.removeEventListener('scroll', onChartScroll);
      labels.removeEventListener('scroll', onLabelsScroll);
    };
  }, []);

  const pStart = new Date(projectStart);
  const pEnd   = new Date(projectEnd);
  const viewStart = addDays(pStart, -3);
  const viewEnd   = addDays(pEnd, 7);
  const totalDays = differenceInDays(viewEnd, viewStart) + 1;
  const dayWidth  = zoom === 'day' ? 40 : zoom === 'week' ? 24 : 14;
  const totalWidth = totalDays * dayWidth;

  const visibleTasks = useMemo(() => {
    const isHidden = (task: GanttTask): boolean => {
      if (!task.parentId) return false;
      if (collapsed.has(task.parentId)) return true;
      const parent = tasks.find(t => t.id === task.parentId);
      return parent ? isHidden(parent) : false;
    };
    return tasks.filter(t => !isHidden(t));
  }, [tasks, collapsed]);

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const dateToX = useCallback((date: Date) => {
    return differenceInDays(date, viewStart) * dayWidth;
  }, [viewStart, dayWidth]);

  // Header columns
  const headerCols = useMemo(() => {
    const cols: { label: string; subLabel?: string; x: number; width: number }[] = [];
    if (zoom === 'day') {
      for (let i = 0; i < totalDays; i++) {
        const d = addDays(viewStart, i);
        cols.push({ label: format(d, 'd'), subLabel: format(d, 'EEE'), x: i * dayWidth, width: dayWidth });
      }
    } else if (zoom === 'week') {
      for (let i = 0; i < totalDays; i += 7) {
        const d = addDays(viewStart, i);
        cols.push({ label: format(d, 'MMM d'), x: i * dayWidth, width: 7 * dayWidth });
      }
    } else {
      let curr = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1);
      while (curr <= viewEnd) {
        const mEnd = new Date(curr.getFullYear(), curr.getMonth() + 1, 0);
        const start = curr < viewStart ? viewStart : curr;
        const end   = mEnd > viewEnd ? viewEnd : mEnd;
        const days  = differenceInDays(end, start) + 1;
        cols.push({ label: format(curr, 'MMM yyyy'), x: dateToX(start), width: days * dayWidth });
        curr = new Date(curr.getFullYear(), curr.getMonth() + 1, 1);
      }
    }
    return cols;
  }, [zoom, viewStart, viewEnd, totalDays, dayWidth, dateToX]);

  const weekendStripes = useMemo(() => {
    if (zoom === 'month') return [];
    const s: { x: number }[] = [];
    for (let i = 0; i < totalDays; i++) {
      if (isWeekend(addDays(viewStart, i))) s.push({ x: i * dayWidth });
    }
    return s;
  }, [zoom, viewStart, totalDays, dayWidth]);

  const todayX = dateToX(new Date());

  // Dependency arrows — orthogonal (right-angle) elbow connectors per obs #28
  const arrows = useMemo(() => {
    const result: { path: string; isCritical: boolean; key: string }[] = [];
    visibleTasks.forEach((task, tIdx) => {
      task.dependencies.forEach(dep => {
        const predIdx = visibleTasks.findIndex(t => t.id === dep.predecessorId);
        if (predIdx < 0) return;
        const pred = visibleTasks[predIdx];
        if (!pred.endDate || !task.startDate) return;
        const x1 = dateToX(new Date(pred.endDate)) + dayWidth;
        const y1 = predIdx * ROW_HEIGHT + HEADER_HEIGHT + ROW_HEIGHT / 2;
        const x2 = dateToX(new Date(task.startDate));
        const y2 = tIdx  * ROW_HEIGHT + HEADER_HEIGHT + ROW_HEIGHT / 2;
        // Build orthogonal elbow: right → down/up → right
        const midX = x1 + Math.max((x2 - x1) / 2, 8);
        const path = y1 === y2
          ? `M${x1},${y1} L${x2},${y2}`                          // same row — just a line
          : `M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`; // elbow
        result.push({
          path,
          isCritical: task.isCritical && pred.isCritical,
          key: `${pred.id}-${task.id}`,
        });
      });
    });
    return result;
  }, [visibleTasks, dateToX, dayWidth]);

  const totalHeight = visibleTasks.length * ROW_HEIGHT + HEADER_HEIGHT;
  const chartHeight = Math.min(totalHeight + 4, 600);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50 flex-wrap gap-y-2">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 w-4 h-4" style={{color:"var(--primary)"}} /> Gantt Chart
        </span>
        <div className="text-xs text-gray-400">
          {format(pStart, 'dd MMM yyyy')} → {format(pEnd, 'dd MMM yyyy')}
        </div>
        <div className="flex-1" />
        {/* Zoom buttons */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
          {(['day','week','month'] as ZoomLevel[]).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className={clsx(
                'px-3 py-1 rounded text-xs font-medium transition-colors capitalize',
                zoom === z ? 'bg-[var(--primary)] text-white' : 'text-gray-500 hover:bg-gray-100'
              )}>
              {z}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => z === 'month' ? 'week' : 'day')}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => z === 'day' ? 'week' : 'month')}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500 border-l pl-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-red-400 inline-block" /> Critical path
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-blue-400 inline-block" /> In Progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rotate-45 inline-block bg-[var(--secondary)] border border-[var(--secondary-hover)]" style={{borderRadius:1}} /> Milestone
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex" style={{ height: chartHeight }}>
        {/* Label column */}
        <div style={{ width: LABEL_WIDTH, flexShrink: 0 }}
          className="border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Label header */}
          <div className="flex items-center px-3 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0"
            style={{ height: HEADER_HEIGHT }}>
            <span className="flex-1">Task Name / WBS</span>
            <span className="w-16 text-center">Progress</span>
            <span className="w-8 text-center">St.</span>
          </div>
          {/* Label rows */}
          <div ref={labelsRef} className="overflow-y-auto flex-1 scrollbar-thin" id="gantt-labels">
            {visibleTasks.map(task => (
              <TaskRow key={task.id} task={task}
                isCollapsed={collapsed.has(task.id)}
                isSelected={selectedTask === task.id}
                onToggle={() => task.hasChildren && toggleCollapse(task.id)}
                onSelect={() => setSelectedTask(s => s === task.id ? null : task.id)}
              />
            ))}
            {visibleTasks.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                No tasks with dates assigned
              </div>
            )}
          </div>
        </div>

        {/* Chart scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-auto scrollbar-thin" id="gantt-chart">
          <svg width={totalWidth} height={Math.max(totalHeight, 200)} style={{ display: 'block', minHeight: '100%' }}>
            {/* Weekend shading */}
            {weekendStripes.map((s, i) => (
              <rect key={i} x={s.x} y={0} width={dayWidth} height={totalHeight} fill="#f9fafb" />
            ))}

            {/* Horizontal row lines */}
            {visibleTasks.map((_, i) => (
              <line key={i} x1={0} y1={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                x2={totalWidth} y2={HEADER_HEIGHT + (i + 1) * ROW_HEIGHT}
                stroke="#f3f4f6" strokeWidth={1} />
            ))}

            {/* Vertical grid lines */}
            {headerCols.map((c, i) => (
              <line key={i} x1={c.x} y1={0} x2={c.x} y2={totalHeight} stroke="#e5e7eb" strokeWidth={0.5} />
            ))}

            {/* Header background */}
            <rect x={0} y={0} width={totalWidth} height={HEADER_HEIGHT} fill="#f9fafb" />
            <line x1={0} y1={HEADER_HEIGHT} x2={totalWidth} y2={HEADER_HEIGHT} stroke="#e5e7eb" strokeWidth={1} />

            {/* Header labels */}
            {headerCols.map((col, i) => (
              <g key={i}>
                <text x={col.x + col.width / 2} y={zoom === 'day' ? 26 : 32}
                  textAnchor="middle" fontSize={11} fill="#6B7280" fontWeight={500}>
                  {col.label}
                </text>
                {col.subLabel && (
                  <text x={col.x + col.width / 2} y={46}
                    textAnchor="middle" fontSize={9} fill="#9CA3AF">
                    {col.subLabel}
                  </text>
                )}
              </g>
            ))}

            {/* Today line */}
            {todayX > 0 && todayX < totalWidth && (
              <g>
                <line x1={todayX} y1={0} x2={todayX} y2={totalHeight}
                  stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
                <rect x={todayX - 18} y={0} width={36} height={16} rx={3} fill="#EF4444" />
                <text x={todayX} y={11} textAnchor="middle" fontSize={8} fill="white" fontWeight={700}>TODAY</text>
              </g>
            )}

            {/* Dependency arrows */}
            <defs>
              <marker id="arr-n" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L0,7 L7,3.5 z" fill="#9CA3AF" />
              </marker>
              <marker id="arr-c" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L0,7 L7,3.5 z" fill="#EF4444" />
              </marker>
            </defs>
            {arrows.map(a => (
              <path key={a.key} d={a.path}
                stroke={a.isCritical ? '#EF4444' : '#94A3B8'}
                strokeWidth={a.isCritical ? 1.5 : 1}
                fill="none"
                markerEnd={`url(#arr-${a.isCritical ? 'c' : 'n'})`}
              />
            ))}

            {/* Task bars */}
            {visibleTasks.map((task, idx) => {
              if (!task.startDate || !task.endDate) return null;
              const start = new Date(task.startDate);
              const end   = new Date(task.endDate);
              const x     = dateToX(start);
              const barY  = HEADER_HEIGHT + idx * ROW_HEIGHT + 10;
              const barH  = ROW_HEIGHT - 20;
              const rawW  = (differenceInDays(end, start) + 1) * dayWidth;
              const w     = Math.max(rawW, task.isMilestone ? 14 : dayWidth);
              const isSelected = selectedTask === task.id;
              const color = task.isCritical ? '#EF4444' : (STATUS_COLORS[task.status] ?? '#9CA3AF');

              if (task.isMilestone) {
                const cx = x + dayWidth / 2;
                const cy = HEADER_HEIGHT + idx * ROW_HEIGHT + ROW_HEIGHT / 2;
                const sz = 7;
                return (
                  <g key={task.id} onClick={() => setSelectedTask(s => s === task.id ? null : task.id)} style={{ cursor: 'pointer' }}>
                    {isSelected && <polygon
                      points={`${cx},${cy-sz-3} ${cx+sz+3},${cy} ${cx},${cy+sz+3} ${cx-sz-3},${cy}`}
                      fill="none" stroke="#3B82F6" strokeWidth={2} />}
                    <polygon
                      points={`${cx},${cy-sz} ${cx+sz},${cy} ${cx},${cy+sz} ${cx-sz},${cy}`}
                      fill="var(--secondary)" stroke="#B45309" strokeWidth={1.5} />
                    <text x={cx + sz + 6} y={cy + 4} fontSize={10} fill="#374151" fontWeight={500}>
                      ◆ {task.name.length > 20 ? task.name.slice(0, 20) + '…' : task.name}
                    </text>
                  </g>
                );
              }

              return (
                <g key={task.id}
                  onClick={() => setSelectedTask(s => s === task.id ? null : task.id)}
                  style={{ cursor: 'pointer' }}>
                  {/* Hit area */}
                  <rect x={x} y={HEADER_HEIGHT + idx * ROW_HEIGHT} width={w}
                    height={ROW_HEIGHT} fill="transparent" />
                  {/* Bar background */}
                  <rect x={x} y={barY} width={w} height={barH} rx={4}
                    fill={color} opacity={0.12} />
                  {/* Progress */}
                  <rect x={x} y={barY} width={Math.max(w * (task.progress / 100), task.progress > 0 ? 6 : 0)}
                    height={barH} rx={4} fill={color} opacity={0.80} />
                  {/* Left priority stripe */}
                  <rect x={x} y={barY} width={4} height={barH} rx={2}
                    fill={PRIORITY_BORDER[task.priority] ?? '#9CA3AF'} opacity={0.9} />
                  {/* Progress label */}
                  {w > 45 && (
                    <text x={x + w / 2} y={barY + barH / 2 + 4}
                      textAnchor="middle" fontSize={9} fill="white" fontWeight={600}>
                      {Math.round(task.progress)}%
                    </text>
                  )}
                  {/* Critical bottom stripe */}
                  {task.isCritical && (
                    <rect x={x} y={barY + barH - 3} width={w} height={3} rx={1} fill="#EF4444" opacity={0.8} />
                  )}
                  {/* Selection outline */}
                  {isSelected && (
                    <rect x={x - 1} y={barY - 1} width={w + 2} height={barH + 2} rx={4}
                      fill="none" stroke="#3B82F6" strokeWidth={2} />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Selected task detail strip */}
      {selectedTask && (() => {
        const t = tasks.find(x => x.id === selectedTask);
        if (!t) return null;
        return (
          <div className="border-t border-gray-200 bg-yellow-50/50 px-4 py-2.5 flex items-center gap-4 text-xs">
            <span className="font-semibold text-gray-800">{t.name}</span>
            {t.wbsCode && <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{t.wbsCode}</span>}
            <span className={clsx('badge text-xs',
              t.status === 'Completed' ? 'badge-green' : t.status === 'InProgress' ? 'badge-blue' :
              t.status === 'OnHold' ? 'badge-yellow' : 'badge-gray')}>{t.status}</span>
            {t.isCritical && <span className="badge badge-red text-xs">🔴 Critical Path</span>}
            {t.startDate && <span className="text-gray-500">Start: <strong>{format(new Date(t.startDate), 'dd MMM yyyy')}</strong></span>}
            {t.endDate   && <span className="text-gray-500">End: <strong>{format(new Date(t.endDate),   'dd MMM yyyy')}</strong></span>}
            <span className="text-gray-500">Progress: <strong className="text-[var(--primary)]">{t.progress}%</strong></span>
            {t.assigneeName && <span className="text-gray-500">👤 {t.assigneeName}</span>}
            {t.dependencies.length > 0 && <span className="text-gray-500">{t.dependencies.length} predecessor(s)</span>}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Task Label Row ───────────────────────────────────────────
function TaskRow({ task, isCollapsed, isSelected, onToggle, onSelect }: {
  task: GanttTask; isCollapsed: boolean; isSelected: boolean;
  onToggle: () => void; onSelect: () => void;
}) {
  const indent = (task.level - 1) * 14;
  return (
    <div onClick={onSelect}
      className={clsx(
        'flex items-center px-2 text-xs border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer select-none',
        isSelected && 'bg-yellow-50 hover:bg-yellow-50'
      )}
      style={{ height: ROW_HEIGHT, paddingLeft: 8 + indent }}>
      {/* Expand toggle */}
      <div className="w-5 flex-shrink-0 flex items-center justify-center">
        {task.hasChildren ? (
          <button onClick={e => { e.stopPropagation(); onToggle(); }}
            className="p-0.5 rounded hover:bg-gray-200">
            {isCollapsed
              ? <ChevronRight className="w-3 h-3 text-gray-400" />
              : <ChevronDown  className="w-3 h-3 text-gray-400" />}
          </button>
        ) : (
          <span className={clsx('w-1.5 h-1.5 rounded-full',
            task.isMilestone ? 'bg-[var(--secondary)]' : 'bg-gray-300')} />
        )}
      </div>
      {/* Name */}
      <div className="flex-1 min-w-0 ml-1">
        {task.wbsCode && (
          <span className="font-mono text-[9px] text-gray-400 mr-1">{task.wbsCode}</span>
        )}
        <span className={clsx('truncate',
          task.isCritical ? 'text-red-600 font-semibold' :
          task.level === 1 ? 'font-semibold text-gray-800' : 'text-gray-700')}>
          {task.name}
        </span>
      </div>
      {/* Progress bar */}
      <div className="w-14 px-1">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full' style={{background:'var(--primary)'}}//{/* progress */}<div className='hidden" style={{ width: `${task.progress}%` }} />
        </div>
      </div>
      {/* Status dot */}
      <div className="w-8 flex justify-center">
        <span className={clsx('w-2 h-2 rounded-full flex-shrink-0',
          task.status === 'Completed' ? 'bg-green-500' :
          task.status === 'InProgress' ? 'bg-blue-500' :
          task.status === 'OnHold' ? 'bg-yellow-500' :
          task.status === 'Cancelled' ? 'bg-red-500' : 'bg-gray-300')} />
      </div>
    </div>
  );
}
