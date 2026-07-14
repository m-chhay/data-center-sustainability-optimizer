export default function Metrics() {
  const stats = [
    {
      value: "1.05",
      label: "Target PUE",
      description:
        "Achieve industry-leading power usage effectiveness through infrastructure optimization.",
      color: "from-emerald-500 to-green-600",
    },
    {
      value: "100%",
      label: "Renewable Coverage",
      description:
        "Model campuses operating entirely on renewable energy sources.",
      color: "from-teal-500 to-cyan-600",
    },
    {
      value: "38%",
      label: "Cooling Savings",
      description:
        "Reduce cooling energy through optimized airflow and thermal strategies.",
      color: "from-sky-500 to-blue-600",
    },
    {
      value: "-27%",
      label: "Carbon Intensity",
      description:
        "Forecast annual emissions reductions before infrastructure investments are made.",
      color: "from-lime-500 to-emerald-600",
    },
  ];

  const timeline = [
    {
      year: "2026",
      title: "Baseline Infrastructure",
      text: "Current operating conditions imported from facility telemetry.",
    },
    {
      year: "2028",
      title: "Renewable Expansion",
      text: "Additional solar capacity and battery storage improve energy mix.",
    },
    {
      year: "2030",
      title: "Cooling Optimization",
      text: "Refined airflow strategies and equipment upgrades reduce cooling demand while maintaining peak compute performance.",
    },
    {
      year: "2035",
      title: "Net-Zero Campus",
      text: "Infrastructure reaches long-term sustainability objectives.",
    },
  ];

  return (
    <section
      id="metrics"
      className="bg-white py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">

        <div className="max-w-3xl">
          <p className="font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Performance Insights
          </p>

          <h2 className="mt-4 text-4xl font-bold tracking-tight text-[#1C2D24]">
            Measure every sustainability decision before it happens.
          </h2>

          <p className="mt-6 text-lg leading-8 text-[#58685F]">
            From infrastructure utilization to carbon intensity, NetGrid Ops
            provides engineering teams with measurable outcomes for every
            optimization strategy.
          </p>
        </div>

        {/* KPI Cards */}

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-4">

          {stats.map((stat) => (
            <article
              key={stat.label}
              className="group overflow-hidden rounded-3xl border border-[#E6EBE7] bg-[#FBFBFA] shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
            >
              <div
                className={`h-2 bg-gradient-to-r ${stat.color}`}
              />

              <div className="p-8">

                <p className="text-5xl font-black tracking-tight text-[#1C2D24]">
                  {stat.value}
                </p>

                <h3 className="mt-4 text-lg font-semibold">
                  {stat.label}
                </h3>

                <p className="mt-4 leading-7 text-[#62736A]">
                  {stat.description}
                </p>

              </div>
            </article>
          ))}

        </div>

        {/* Lower Dashboard */}

        <div className="mt-24 grid gap-10 lg:grid-cols-[1.3fr_0.9fr]">

          {/* Impact Chart */}

          <div className="rounded-[32px] border border-[#E6EBE7] bg-[#F8FAF8] p-10">

            <div className="flex items-center justify-between">

              <div>
                <p className="font-semibold text-[#1C2D24]">
                  Carbon Reduction Trajectory
                </p>

                <p className="mt-2 text-sm text-[#6A7B72]">
                  Estimated annual emissions after optimization
                </p>
              </div>

              <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                Projected
              </span>

            </div>

            <div className="relative mt-14 h-72">

              {/* Grid */}

              <div className="absolute inset-0 bg-[linear-gradient(rgba(31,41,55,0.07)_1px,transparent_1px)] bg-[size:100%_48px]" />

              {/* Line */}

              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 700 280"
              >
                <defs>

                  <linearGradient
                    id="line"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      stopColor="#16A34A"
                    />
                    <stop
                      offset="100%"
                      stopColor="#0F766E"
                    />
                  </linearGradient>

                </defs>

                <path
                  d="M40 70
                     C180 90,
                     260 150,
                     360 165
                     S520 220,
                     660 235"
                  stroke="url(#line)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />

                {[40, 180, 360, 520, 660].map((x) => (
                  <circle
                    key={x}
                    cx={x}
                    cy={
                      x === 40
                        ? 70
                        : x === 180
                          ? 100
                          : x === 360
                            ? 165
                            : x === 520
                              ? 205
                              : 235
                    }
                    r="7"
                    fill="#16A34A"
                  />
                ))}

              </svg>

            </div>

          </div>

          {/* Timeline */}

          <div className="rounded-[32px] border border-[#E6EBE7] bg-[#FBFBFA] p-10">

            <h3 className="text-xl font-semibold text-[#1C2D24]">
              Optimization Roadmap
            </h3>

            <div className="mt-10 space-y-8">

              {timeline.map((item, index) => (
                <div
                  key={item.year}
                  className="relative pl-8"
                >

                  <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-emerald-600" />

                  {index !== timeline.length - 1 && (
                    <div className="absolute left-[7px] top-5 h-full w-[2px] bg-[#D7DDD7]" />
                  )}

                  <p className="font-bold text-emerald-700">
                    {item.year}
                  </p>

                  <h4 className="mt-1 font-semibold text-[#1C2D24]">
                    {item.title}
                  </h4>

                  <p className="mt-2 text-sm leading-7 text-[#65756D]">
                    {item.text}
                  </p>

                </div>
              ))}

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}