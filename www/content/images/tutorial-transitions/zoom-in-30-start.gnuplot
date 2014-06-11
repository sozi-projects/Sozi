set xlabel "Time"
set ylabel "Zoom"
set xrange [0:14.477]
set yrange [0:150]
set label "frame1" at 1,100
set arrow from 0.9,100 to 0.1,100
set label "frame2" at 11.9,49
set arrow from 13.377,49 to 14.377,49
plot 130-(x-5.477)**2

