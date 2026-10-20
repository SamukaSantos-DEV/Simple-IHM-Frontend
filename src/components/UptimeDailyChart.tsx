import ReactECharts from 'echarts-for-react';

interface DailyData {
  day: string;
  onHours: number;
  offHours: number;
}

export default function UptimeDailyChart({ data, darkMode }: { data: DailyData[], darkMode: boolean }) {
  const textColor = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const gridColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: darkMode ? '#1a1a1a' : '#fff',
      borderColor: gridColor,
      textStyle: { color: darkMode ? '#fff' : '#000' },
      formatter: (params: any) => {
        let res = `${params[0].name}<br/>`;
        params.forEach((p: any) => {
          res += `${p.marker} ${p.seriesName}: ${p.value}h<br/>`;
        });
        return res;
      }
    },
    legend: {
      textStyle: { color: textColor },
      bottom: 0
    },
    grid: {
      top: '10%',
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.day),
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor }
    },
    yAxis: {
      type: 'value',
      max: 24,
      name: 'Horas',
      nameTextStyle: { color: textColor },
      splitLine: { lineStyle: { type: 'dashed', color: gridColor } },
      axisLabel: { color: textColor }
    },
    series: [
      {
        name: 'Ligado',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        itemStyle: { 
          color: '#34C759',
          borderRadius: [0, 0, 4, 4]
        },
        data: data.map(d => d.onHours)
      },
      {
        name: 'Desligado',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        itemStyle: { 
          color: '#FF3B30',
          borderRadius: [4, 4, 0, 0]
        },
        data: data.map(d => d.offHours)
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '250px' }} />;
}
