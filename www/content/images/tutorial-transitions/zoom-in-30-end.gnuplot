set xlabel "Time"
set ylabel "Zoom"
set xrange [0:14.477]
set yrange [0:150]
set label "frame1" at 1,49
set arrow from 0.9,49 to 0.1,49
set label "frame2" at 11.9,100
set arrow from 13.377,100 to 14.377,100
plot 130-(x-9)**2

