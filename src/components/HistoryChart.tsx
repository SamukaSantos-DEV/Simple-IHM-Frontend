import ReactECharts from 'echarts-for-react';

export default function HistoryChart({ data, darkMode }: { data: { time: string, status: number }[], darkMode: boolean }) {
  const textColor = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const option = {
    backgroundColor: 'transparent',
    xAxis: {
      type: 'category',
      data: data.map(d => d.time),
      axisLabel: { color: textColor }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      interval: 1,
      axisLabel: { 
        color: textColor,
        formatter: (value: number) => value === 1 ? 'ON' : 'OFF'
      },
      splitLine: { show: false }
    },
    series: [{
      data: data.map(d => d.status),
      type: 'line',
      step: 'start',
      lineStyle: { color: '#34C759', width: 3 },
      areaStyle: { color: 'rgba(52, 199, 89, 0.1)' }
    }]
  };

  return <ReactECharts option={option} style={{ height: '150px' }} />;
}
