Vue.config.ignoredElements = [
  "count",
  "rating",
  "promotecount",
  "popuptemplate",
  "lines",
  "photo"
];

function getSorter(property) {
  return function(a, b) {
    return a[property] - b[property];
  };
}

Vue.filter("format_date_time", function(value) {
  return DateUtils.getFormattedDateTime(value);
});

Vue.filter("shortnaturaltime", function(value) {
  return DateUtils.getShortNaturalTime(value);
});

Vue.filter("linkify", function(value) {
  return Linkify.getLinkifiedText(value);
});

Vue.filter("lower", function(value) {
  return value.toLowerCase();
});

Vue.filter("upper", function(value) {
  return value.toUpperCase();
});

Vue.filter("capitalize", function(value) {
  return capitalize(value);
});

Vue.filter("unescape", function(value) {
  return value
    .split("&#39;")
    .join("'")
    .split("&quot;")
    .join('"')
    .split("&gt;")
    .join(">")
    .split("&lt;")
    .join("<")
    .split("&amp;")
    .join("&");
});

Vue.filter("resize", RenderUtils.resize);
Vue.filter("getS3Url", RenderUtils.getS3Url);
Vue.filter("truncate", RenderUtils.truncate);

Vue.component("time-ago", {
  props: {
    datetime: {
      type: [Number, Date],
      required: true
    },
    title: {
      type: [String, Boolean]
    },
    autoUpdate: {
      type: [Number, String, Boolean]
    },
    converter: {
      type: Function
    }
  },

  data: function() {
    return {
      timeago: this.getTimeAgo(),
      recomputations: 0,
      smartUpdaterPeriod: 1
    };
  },

  mounted: function() {
    this.startUpdater();
  },

  beforeDestroy: function() {
    this.stopUpdater();
  },

  render: function(h) {
    return h(
      "time",
      {
        attrs: {
          datetime: new Date(this.datetime),
          title:
            typeof this.title === "string"
              ? this.title
              : this.title === false
              ? null
              : this.timeago
        }
      },
      [this.timeago]
    );
  },

  computed: {
    isSmart: function() {
      return this.autoUpdate === "smart";
    },

    updatePeriod: function() {
      if (!this.autoUpdate) {
        return null;
      }

      return this.autoUpdate === true ? 60 : this.autoUpdate;
    },

    smartUpdatePeriod: function() {
      this.recomputations;
      if (!this.isSmart) {
        return null;
      }

      const delta =
        (new Date().getTime() - new Date(this.datetime).getTime()) / 1000;

      const times = [1, 60, 60, 24, 30];
      const multiplier = function(a, b) {
        return a * b;
      };
      for (let i = 2; i <= times.length; i++) {
        const check = times.slice(0, i).reduce(multiplier, 1);

        if (delta < check) {
          this.smartUpdaterPeriod = Math.floor(check - delta) + 1;
          return times.slice(0, i - 1).reduce(multiplier, 1);
        }
      }

      this.smartUpdaterPeriod = null;

      return null;
    }
  },

  methods: {
    getTimeAgo: function(datetime) {
      const converter = this.converter || DateUtils.getShortNaturalTime;
      return converter(datetime || this.datetime);
    },

    convert: function(datetime) {
      this.timeago = this.getTimeAgo(datetime);
    },

    startSmartUpdater: function() {
      if (this.smartUpdatePeriod) {
        this.updater = setTimeout(
          function() {
            this.convert();
            this.startSmartUpdater();
          }.bind(this),
          this.smartUpdatePeriod * 1000
        );
      }
    },

    startUpdater: function() {
      if (!this.autoUpdate) {
        return;
      }

      if (this.isSmart) {
        this.startSmartUpdater();
      } else {
        this.updater = setInterval(
          function() {
            this.convert();
          }.bind(this),
          this.updatePeriod * 1000
        );
      }
    },

    clearUpdater: function() {
      if (this.updater) {
        clearInterval(this.updater);
        this.updater = null;
      }
    },

    clearSmartUpdater: function() {
      if (this.smartUpdater) {
        clearTimeout(this.smartUpdater);
        this.smartUpdater = null;
      }
    },

    stopUpdater: function() {
      this.clearUpdater();
      this.clearSmartUpdater();
    }
  },

  watch: {
    autoUpdate: function(newValue) {
      this.stopUpdater();
      if (newValue) {
        this.startUpdater();
      }
    },

    datetime: function() {
      this.convert();
    },

    converter: function() {
      this.convert();
    },

    smartUpdaterPeriod(newValue) {
      if (!this.isSmart) {
        return;
      }

      this.clearSmartUpdater();
      if (newValue) {
        this.smartUpdater = setTimeout(
          function() {
            // Trigger smartUpdateTime to be recalculated
            this.recomputations++;
          }.bind(this),
          newValue * 1000
        );
      } else {
        this.clearUpdater();
      }
    }
  }
});

Vue.component("auto-collapse-text", {
  props: {
    content: {
      type: String,
      required: true
    },
    linkify: Boolean,
    keywords: Array,
    limit: Number,
    escape: Boolean
  },
  data: function() {
    return {
      collapsed: true
    };
  },
  computed: {
    collapsedText: function() {
      const content = RenderUtils.truncate(this.content, 500);
      if (!this.linkify) {
        return content;
      }
      return Linkify.linkifyAll(content, this.keywords, this.escape);
    },
    fullText: function() {
      if (!this.linkify) {
        return this.content;
      }
      return Linkify.linkifyAll(this.content, this.keywords, this.escape);
    },
    visibleText: function() {
      if (this.isLong && !this.collapsed) {
        return this.fullText;
      } else {
        return this.collapsedText;
      }
    },
    isLong: function() {
      return this.content.length > (this.limit || 500);
    },
    toggleText: function() {
      return this.collapsed ? "Read All" : "Read Less";
    }
  },
  template: /* html */ `
  <p>
    <span v-html="visibleText"></span>
    <a v-if="isLong" @click="collapsed = !collapsed" href="javascript:void(0)" class="colorBlue fontGeorgia toggle-link" style="font-size:0.9rem">{{ toggleText }}</a>
  </p>
  `
});

Vue.component("smart-img", {
  props: {
    src: {
      type: String,
      required: true
    },
    lazy: Boolean,
    size: String,
    forceResize: Boolean
  },

  data: function() {
    return {
      loaded: false
    };
  },

  computed: {
    image: function() {
      if (!this.size) {
        return this.src;
      }

      return RenderUtils.getS3Url(this.src, this.size, this.forceResize);
    },
    opacity: function() {
      return this.lazy ? (this.loaded ? 1 : 0) : 1;
    }
  },

  mounted: function() {
    const vm = this;
    this.$refs.image.onload = function() {
      vm.loaded = true;
    };
  },
  // }
  /** hoho} */
  template   : /* html } */ `<img ref="image" :src="this.image" :style="{ opacity: opacity }" >`
});

Vue.component("small-loader", {
  template: `
      <div class="loader15 center_loader_small width100">
          <div class="sk-fading-circle }blue-loader">
              <div class="sk-circle1 sk-circle"></div>
              <div class="sk-circle2 sk-circle"></div>
              <div class="sk-circle3 sk-circle"></div>
              <div class="sk-circle4 sk-circle"></div>
              <div class="sk-circle5 sk-circle"></div>
              <div class="sk-circle6 sk-circle"></div>
          </div>
      </div>
  `
});

Vue.component("end-of-posts", {
  template   : `
    <div class="htStyle-1 textCenter font12 mt30 mb20 end-of-posts" style="display: block;">
        <span>End</span>
    </div>
  `
});

new Vue({
  el: "#app",
  data: {
      message: "Hello Vue.js!"
  },
  template: /* html */ `
  <div>
      <p>{{message}}</p>
      <haha player="Abba" instrument="Harmonium" />
  </div>
  `
});
