'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isAfter, startOfWeek, endOfWeek } from 'date-fns';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface DailyCheckIns {
  karl: boolean;
  chang: boolean;
}

interface CheckInMap {
  [date: string]: DailyCheckIns;
}

interface CalendarProps {
  checkins: CheckInMap;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onNavigate: (year: number, month: number) => void;
  currentUser: string;
}

function Arrow({ direction = 'right' }: { direction?: 'left' | 'right' }) {
  return (
    <div className={`w-5 h-5 relative ${direction === 'left' ? 'transform rotate-180' : ''}`}>
      <Image
        src="/arrow.svg"
        alt={`${direction} arrow`}
        fill
        className="object-contain"
      />
    </div>
  );
}

function CheckInCount({ count, color }: { count: number, color: 'red' | 'purple' }) {
  return (
    <div className={`
      px-3 h-6 flex items-center justify-center text-white text-sm font-bold
      ${color === 'red' ? 'bg-red-500 rounded-l-full' : 'bg-purple-500 rounded-r-full'}
    `}>
      {count}
    </div>
  );
}

function CheckInIndicator({ karlCheckedIn, changCheckedIn }: { karlCheckedIn: boolean, changCheckedIn: boolean }) {
  return (
    <AnimatePresence>
      {(karlCheckedIn || changCheckedIn) && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20
          }}
          className="absolute top-1 right-1 w-3 h-3"
        >
          {karlCheckedIn && changCheckedIn ? (
            <div className="w-full h-full rounded-full overflow-hidden">
              <div className="w-full h-full relative">
                <div className="absolute top-0 left-0 w-full h-full bg-purple-500 clip-diagonal"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-red-500 clip-diagonal-inverse"></div>
              </div>
            </div>
          ) : (
            <div className={`w-full h-full rounded-full ${karlCheckedIn ? 'bg-purple-500' : 'bg-red-500'}`}></div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Calendar({ checkins, selectedDate, onDateSelect, onNavigate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  // Get the first day of the month
  const monthStart = startOfMonth(currentMonth);
  // Get the start of the week for the first day of the month
  const calendarStart = startOfWeek(monthStart);
  // Get the end of the month
  const monthEnd = endOfMonth(currentMonth);
  // Get the end of the week for the last day of the month
  const calendarEnd = endOfWeek(monthEnd);

  // Calculate check-in counts once
  const changCount = Object.entries(checkins)
    .filter(([date, day]) => startOfMonth(new Date(date)).getTime() === startOfMonth(currentMonth).getTime() && day.chang)
    .length;
  const karlCount = Object.entries(checkins)
    .filter(([date, day]) => startOfMonth(new Date(date)).getTime() === startOfMonth(currentMonth).getTime() && day.karl)
    .length;

  // Generate all days that should appear in the calendar
  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    onNavigate(year, month);
  }, [currentMonth]);

  const handleMonthChange = (direction: 'previous' | 'next') => {
    const newMonth = direction === 'previous'
      ? subMonths(currentMonth, 1)
      : addMonths(currentMonth, 1);

    // Don't proceed if trying to navigate to future months
    if (direction === 'next' && isAfter(startOfMonth(newMonth), new Date())) {
      return;
    }

    setCurrentMonth(newMonth);

    // Get the last day of the target month
    const lastDayOfMonth = endOfMonth(newMonth).getDate();
    // Get the current selected day
    const currentSelectedDay = selectedDate.getDate();
    // Use the smaller of the two to ensure valid date
    const newDay = Math.min(currentSelectedDay, lastDayOfMonth);

    // Create new date with adjusted day
    const newDate = new Date(newMonth.getFullYear(), newMonth.getMonth(), newDay);
    onDateSelect(newDate);
  };

  const getCheckInStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayCheckins = checkins[dateStr] || { karl: false, chang: false };
    return {
      karlCheckedIn: dayCheckins.karl,
      changCheckedIn: dayCheckins.chang
    };
  };

  const nextMonthDisabled = isAfter(startOfMonth(addMonths(currentMonth, 1)), new Date());

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          onClick={() => handleMonthChange('previous')}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Arrow direction="left" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg lg:text-xl font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex">
            <CheckInCount count={changCount} color="red" />
            <CheckInCount count={karlCount} color="purple" />
          </div>
        </div>
        <button
          onClick={() => handleMonthChange('next')}
          className={`p-1 rounded-lg transition-colors ${!nextMonthDisabled ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : 'opacity-25'}`}
          disabled={nextMonthDisabled}
        >
          <Arrow />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center font-semibold text-sm pb-2">
            {day}
          </div>
        ))}
        {days.map(day => {
          const { karlCheckedIn, changCheckedIn } = getCheckInStatus(day);
          const isSelected = isSameDay(day, selectedDate);
          const isDisabled = isAfter(day, new Date());
          const isCurrent = isSameMonth(day, currentMonth);

          return (
            <button
              key={day.toString()}
              onClick={() => !isDisabled && onDateSelect(day)}
              disabled={isDisabled}
              className={`
                relative h-12 lg:h-16 p-1 rounded-lg transition-colors flex items-center justify-center
                ${isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'}
                ${!isCurrent && 'opacity-30'}
              `}
            >
              <div className="text-sm">{format(day, 'd')}</div>
              <CheckInIndicator
                karlCheckedIn={karlCheckedIn}
                changCheckedIn={changCheckedIn}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
