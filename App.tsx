import React, { useState, useMemo } from 'react';
import { INITIAL_DATA } from './constants.ts';
import { DispatcherStats, FilterState, SortDirection, SortField } from './types.ts';
import DataTable from './components/DataTable.tsx';
import FilterBar from './components/FilterBar.tsx';
import ComparisonCharts from './components/ComparisonCharts.tsx';
import IndividualAnalysis from './components/IndividualAnalysis.tsx';
import { BarChart2, Bell, Search, Activity, Trophy, Timer } from 'lucide-react';

// 辅助函数：获取本地时间的 ISO 字符串格式 (yyyy-MM-ddThh:mm)
const getLocalISOString = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
  return localISOTime;
};

const App: React.FC = () => {
  // --- State ---
  const [data] = useState<DispatcherStats[]>(INITIAL_DATA);
  const [showFilters, setShowFilters] = useState(false);
  
  // 初始化时间范围
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultEndDate.getDate() - 7);
  defaultStartDate.setHours(8, 0, 0, 0);

  const [filters, setFilters] = useState<FilterState>({
    startDate: getLocalISOString(defaultStartDate),
    endDate: getLocalISOString(defaultEndDate),
    projectCategory: '全部',
    searchQuery: '',
  });
  
  const [sortField, setSortField] = useState<SortField>('successRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Logic ---

  // 1. Filter Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (filters.projectCategory !== '全部' && item.projectCategory !== filters.projectCategory) {
        return false;
      }
      if (filters.searchQuery && !item.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }
      
      if (filters.startDate && filters.endDate) {
          const itemDate = new Date(item.date);
          const start = new Date(filters.startDate);
          const end = new Date(filters.endDate);
          
          if (itemDate < start || itemDate > end) {
              return false;
          }
      }
      return true;
    });
  }, [data, filters]);

  // 2. Sort Data
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // 3. Selection Data for Charts
  const selectedData = useMemo(() => {
    return data.filter(item => selectedIds.has(item.id));
  }, [data, selectedIds]);

  // 4. Calculate Aggregate Metrics for Overview Bar
  const overviewMetrics = useMemo(() => {
    const count = filteredData.length;
    if (count === 0) return null;

    const totalOrders = filteredData.reduce((acc, cur) => acc + cur.totalOrders, 0);
    const avgSuccess = filteredData.reduce((acc, cur) => acc + cur.successRate, 0) / count;
    const avgDispatch = filteredData.reduce((acc, cur) => acc + cur.dispatchRate, 0) / count;
    const avgRevenue = filteredData.reduce((acc, cur) => acc + cur.avgRevenue, 0) / count;
    const avg30Min = filteredData.reduce((acc, cur) => acc + cur.dispatch30MinRate, 0) / count;
    const avgResponse = filteredData.reduce((acc, cur) => acc + cur.avgResponseTime, 0) / count;

    return {
      totalOrders,
      avgSuccess: avgSuccess.toFixed(1),
      avgDispatch: avgDispatch.toFixed(1),
      avgRevenue: avgRevenue.toFixed(1),
      avg30Min: avg30Min.toFixed(1),
      avgResponse: avgResponse.toFixed(1)
    };
  }, [filteredData]);

  // --- Handlers ---

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === sortedData.length && sortedData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedData.map(d => d.id)));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* 1. System Announcement (Scrolling) */}
      <div className="bg-orange-50 border-b border-orange-100 h-10 overflow-hidden flex items-center relative">
         <div className="absolute left-0 bg-orange-50 z-10 px-3 h-full flex items-center border-r border-orange-100">
            <Bell className="h-4 w-4 text-orange-500 mr-2" />
            <span className="text-xs font-bold text-orange-600 whitespace-nowrap">系统公告</span>
         </div>
         <div className="whitespace-nowrap overflow-hidden flex-1">
             <div className="animate-marquee inline-block pl-4 text-xs text-slate-600">
                <span className="mr-12">🔥 紧急通知：系统将于今晚 02:00 进行例行维护，预计耗时 15 分钟，请提前保存数据。</span>
                <span className="mr-12">🏆 喜报：恭喜上海浦东区张师傅获得本月“服务之星”称号，奖励现金 500 元！</span>
                <span className="mr-12">📢 新功能上线：现在支持导出 Excel 报表，请在“设置”中查看。</span>
                <span>⚡ 效率提升：上周整体派单响应速度提升 12%，感谢大家的努力！</span>
             </div>
         </div>
         <style>{`
            @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-100%); }
            }
            .animate-marquee {
                animation: marquee 30s linear infinite;
            }
            .animate-marquee:hover {
                animation-play-state: paused;
            }
         `}</style>
      </div>

      <main className="w-full px-3 py-6">
        
        {/* 2. Data Overview Bar */}
        <div className="bg-[#F0F8FF] rounded-xl border border-blue-100 h-[60px] mb-6 flex items-center justify-between px-4 shadow-sm">
            <div className="flex items-center gap-2 min-w-max mr-4">
                <Activity className="h-5 w-5 text-blue-600" />
                <h2 className="text-[18px] font-[700] text-slate-800">数据概览</h2>
            </div>
            
            {overviewMetrics && (
                <div className="flex flex-1 items-center justify-around px-2">
                     <div className="flex items-center gap-2 whitespace-nowrap">
                         <span className="text-[12px] font-[400] text-[#5A5E66]">成单率:</span>
                         <span className="text-[16px] font-[700] text-slate-800">{overviewMetrics.avgSuccess}%</span>
                     </div>
                     <div className="flex items-center gap-2 whitespace-nowrap">
                         <span className="text-[12px] font-[400] text-[#5A5E66]">派单率:</span>
                         <span className="text-[16px] font-[700] text-blue-600">{overviewMetrics.avgDispatch}%</span>
                     </div>
                     <div className="flex items-center gap-2 whitespace-nowrap">
                         <span className="text-[12px] font-[400] text-[#5A5E66]">每单业绩:</span>
                         <span className="text-[16px] font-[700] text-orange-600">¥{overviewMetrics.avgRevenue}</span>
                     </div>
                     <div className="flex items-center gap-2 whitespace-nowrap">
                         <span className="text-[12px] font-[400] text-[#5A5E66]">30分派单率:</span>
                         <span className="text-[16px] font-[700] text-green-600">{overviewMetrics.avg30Min}%</span>
                     </div>
                     <div className="flex items-center gap-2 whitespace-nowrap">
                         <span className="text-[12px] font-[400] text-[#5A5E66]">当日总单量:</span>
                         <span className="text-[16px] font-[700] text-slate-800">{overviewMetrics.totalOrders}</span>
                     </div>
                     <div className="flex items-center gap-2 whitespace-nowrap">
                         <span className="text-[12px] font-[400] text-[#5A5E66]">平均响应:</span>
                         <span className="text-[16px] font-[700] text-purple-600">
                             {overviewMetrics.avgResponse}分
                         </span>
                     </div>
                </div>
            )}

            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors min-w-max ml-4 ${showFilters ? 'bg-blue-200 text-blue-800' : 'bg-[#D9ECFF] text-blue-700 hover:bg-[#C5E2FF]'}`}
            >
                <Search className="h-4 w-4" />
                点这高级筛选
            </button>
        </div>

        {/* Conditional Filters */}
        {showFilters && (
            <div className="animate-in slide-in-from-top-2 duration-200">
                <FilterBar filters={filters} setFilters={setFilters} />
            </div>
        )}

        {/* Dynamic Analysis Section */}
        {selectedIds.size === 1 && (
            <IndividualAnalysis 
                user={selectedData[0]} 
                onClose={() => setSelectedIds(new Set())}
            />
        )}

        {selectedIds.size > 1 && (
          <div className="mb-8 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-slate-800">对比分析</h3>
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        已选 {selectedIds.size} 人
                    </span>
                </div>
                <button 
                    onClick={() => setSelectedIds(new Set())}
                    className="text-sm text-slate-500 hover:text-red-500 underline transition-colors"
                >
                    清空选择
                </button>
            </div>
            <ComparisonCharts selectedData={selectedData} />
          </div>
        )}

        {/* Data Table */}
        <DataTable 
          data={sortedData}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleAll={handleToggleAll}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />

      </main>
    </div>
  );
};

export default App;