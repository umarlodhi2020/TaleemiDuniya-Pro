import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary' }) => {
  const colorMap = {
    primary: 'text-primary-500 bg-primary-500/10',
    secondary: 'text-secondary-500 bg-secondary-500/10',
    success: 'text-green-500 bg-green-500/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
    danger: 'text-red-500 bg-red-500/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GlassCard className="flex items-center justify-between">
        <div>
          <p className="text-dark-muted text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          
          {trend && (
            <div className={`flex items-center mt-2 text-xs font-semibold ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
              <span>{trend === 'up' ? '↑' : '↓'} {trendValue}%</span>
              <span className="text-dark-muted ml-1 font-normal">vs last month</span>
            </div>
          )}
        </div>
        
        <div className={`p-4 rounded-2xl ${colorMap[color] || colorMap.primary}`}>
          <Icon size={24} />
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default StatCard;
