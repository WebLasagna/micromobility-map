<template>
  <header>
    <h1>Private micromobility map</h1>
  </header>
  <aside class="top" @click="isMobile && !expand ? expand = true : false">
    <i class="expand material-icons" @click.stop="expand = false" v-if="isMobile && expand">keyboard_arrow_down</i>
    <i class="expand material-icons" v-else-if="isMobile && !expand">keyboard_arrow_up</i>
    <div v-if="!isMobile || expand">
      <h2>Services</h2>
      <div class="service" v-for="service in services" :key="service.id">
        <div class="header">
          <img :src="`/services/${service.slug}.png`" alt="">
          <span class="name">{{ service.name }}</span>
        </div>
        <div class="layers">
          <div v-if="service.layers">
            <i class="material-icons">lens</i>
            <input type="checkbox" v-model="service.layers.units">
          </div>
          <div v-if="service.layers && service.layers.trips !== 'unavailable'">
            <i class="material-icons">timeline</i>
            <input type="checkbox" v-model="service.layers.trips">
          </div>
        </div>
      </div>
      <div class="cities">
        <span class="title">Cities</span>
        <div class="grid">
          <a class="name" @click="flyTo([2.3732546, 48.8677221])">Paris</a>
          <a class="name" @click="flyTo([-0.1278, 51.5074])">London</a>
          <a class="name" @click="flyTo([13.4, 52.52])">Berlin</a>
          <a class="name" @click="flyTo([4.3517, 50.8503])">Brussels</a>
          <a class="name" @click="flyTo([12.5, 41.9])">Rome</a>
          <a class="name" @click="flyTo([7.68, 45.07])">Turin</a>
          <a class="name" @click="flyTo([9.18, 45.4667])">Milan</a>
          <a class="name" @click="flyTo([8.55, 47.37])">Zurich</a>
          <a class="name" @click="flyTo([4.8322, 45.7578])">Lyon</a>
          <a class="name" @click="flyTo([-0.5707, 44.8373])">Bordeaux</a>
        </div>
      </div>
    </div>
  </aside>
  <aside class="tier" v-if="selected && selected.service.slug === 'tier'">
    <div class="head">
      <i class="material-icons close" @click="selected = null">close</i>
      <img src="./assets/services/tier.png" alt="Tier">
      <span class="name">E-scooter n°{{ selected.code }}</span>
    </div>
    <div class="battery">
      <div
        :style="`width: ${selected.batteryLevel}%`"
        :class="{low: selected.batteryLevel < 30, medium: selected.batteryLevel > 30 && selected.batteryLevel < 50, good: selected.batteryLevel > 50}"
      >
        <span v-if="selected.batteryLevel > 45">{{ selected.batteryLevel }}%</span>
      </div>
      <span v-if="selected.batteryLevel < 45">{{ selected.batteryLevel }}%</span>
    </div>
    <span><b>Last trip date :</b> {{ new Date(selected.lastTripDate).toLocaleString('fr') }}</span>
    <span class="more-info" @click="selected.moreInfo = !selected.moreInfo">Plus d'infos <i class="material-icons" v-if="!selected.moreInfo">keyboard_arrow_down</i><i class="material-icons" v-else>keyboard_arrow_up</i></span>
    <div v-if="selected.moreInfo">
      <span><b>Tier ID :</b> {{ selected.serviceID }}</span>
    </div>
  </aside>
  <aside class="cityscoot" v-if="selected && selected.service.slug === 'cityscoot'">
    <div class="head">
      <i class="material-icons close" @click="selected = null">close</i>
      <img src="./assets/services/cityscoot.png" alt="Cityscoot">
      <span class="name">Scooter n°{{ selected.serviceID }}</span>
    </div>
    <div class="battery">
      <div
        :style="`width: ${selected.batteryLevel}%`"
        :class="{low: selected.batteryLevel < 30, medium: selected.batteryLevel > 30 && selected.batteryLevel < 50, good: selected.batteryLevel > 50}"
      >
        <span v-if="selected.batteryLevel > 45">{{ selected.batteryLevel }}%</span>
      </div>
      <span v-if="selected.batteryLevel < 45">{{ selected.batteryLevel }}%</span>
    </div>
    <span><b>License plate :</b> {{ selected.licensePlate }}</span>
  </aside>
  <aside class="yego" v-if="selected && selected.service.slug === 'yego'">
    <div class="head">
      <i class="material-icons close" @click="selected = null">close</i>
      <img src="./assets/services/yego.png" alt="Yego">
      <span class="name">Scooter "{{ selected.name }}"</span>
    </div>
    <div class="battery">
      <div
        :style="`width: ${selected.batteryLevel}%`"
        :class="{low: selected.batteryLevel < 30, medium: selected.batteryLevel > 30 && selected.batteryLevel < 50, good: selected.batteryLevel > 50}"
      >
        <span v-if="selected.batteryLevel > 45">{{ selected.batteryLevel }}%</span>
      </div>
      <span v-if="selected.batteryLevel < 45">{{ selected.batteryLevel }}%</span>
    </div>
    <span><b>ID number :</b> {{ selected.serviceID }}</span>
  </aside>
  <main ref="map"></main>
  <button class="geolocate" @click="geolocate()"><i class="material-icons" v-if="!geolocating">my_location</i><i class="material-icons" v-else>location_searching</i></button>
  <footer>
    <span>Made by <a href="https://octave.cafe" target="_blank">Octave</a></span>
  </footer>
</template>

<script>
import mapbox from 'mapbox-gl'

import services from './services.json'

let map, geolocationMarkerEl

export default {
  data() {
    return {
      selected: null,
      services: services,
      expand: false,
      geolocating: false
    }
  },
  mounted() {
    mapbox.accessToken = "pk.eyJ1Ijoid2VibGFzYWduYSIsImEiOiJja2p6dnF0N3gwYmtkMm9rMnR6d3h1Nmh2In0.rJKMv0HFIrHzfVKP4_hP9g"

    map = new mapbox.Map({
      container: this.$refs.map,
      style: "mapbox://styles/weblasagna/ckqle7zt94zjh17qsbuhvh535",
      center: [2.354, 48.859],
      zoom: 10.5,
      /* minZoom: 4, */
      /* maxBounds: [
        [0.59326171875, 47.923704717745686],
        [4.592285156249999, 49.56085220619185]
      ], */
      maxPitch: 0,
      defaultLanguage: 'fr'
    })

    map.on('load', () => {
      map.resize()

      services.forEach(service => {
        this.$io.on(`${service.slug}Units`, units => {
          service.units = units
          const unitsGeoJSONData = {
            type: 'FeatureCollection',
            features: units.map(unit => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: unit.location.coords
              },
              properties: unit
            }))
          }
          if(!map.getSource(`${service.slug}-units`)) {
            map.addSource(`${service.slug}-units`, {
              type: 'geojson',
              data: unitsGeoJSONData
            })
          }
          else map.getSource(`${service.slug}-units`).setData(unitsGeoJSONData)

          if(!map.getLayer(`${service.slug}-units-points`)) map.addLayer({
            id: `${service.slug}-units-points`,
            type: 'circle',
            source: `${service.slug}-units`,
            paint: {
              'circle-radius': 2,
              'circle-color': service.color
            },
            minzoom: 8,
            maxzoom: 16
          })

          if(!map.getLayer(`${service.slug}-units`)) map.loadImage(`/icons/${service.icon}.png`, (error, image) => {
            if (error) throw error

            map.addImage(service.icon, image)
            map.addLayer({
              id: `${service.slug}-units`,
              type: 'symbol',
              source: `${service.slug}-units`,
              layout: {
                'icon-image': service.icon,
                'icon-size': 0.1,
                'icon-anchor': 'bottom',
                'icon-allow-overlap': true,
                'visibility': 'visible'
              },
              minzoom: 16
            })
          })

          const showUnit = e => {
            const unit = map.queryRenderedFeatures(e.point)[0].properties
            unit.service = service
            this.selected = unit
          }
          
          map.on('click', `${service.slug}-units-points`, showUnit)
          map.on('click', `${service.slug}-units`, showUnit)
        })
        // same but for trips
        this.$io.on(`${service.slug}Trips`, trips => {
          service.trips = trips
          const tripsGeoJSONData = {
            type: 'FeatureCollection',
            features: trips.map(trip => ({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: trip.route || [trip.start.location, trip.end.location]
              },
              properties: trip
            }))
          }
          if(!map.getSource(`${service.slug}-trips`)) {
            map.addSource(`${service.slug}-trips`, {
              type: 'geojson',
              data: tripsGeoJSONData
            })
          }
          else map.getSource(`${service.slug}-trips`).setData(tripsGeoJSONData)

          if(!map.getLayer(`${service.slug}-trips`)) map.addLayer({
            id: `${service.slug}-trips`,
            type: 'line',
            source: `${service.slug}-trips`,
            paint: {
              'line-color': service.color,
              'line-width': 2
            },
            minzoom: 9
          })
        })
        this.$io.emit('subscribe', service.slug)
      })
    })
  },
  computed: {
    isMobile() {
      return navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)
    }
  },
  methods: {
    flyTo(coords){
      map.flyTo({
        center: coords,
        zoom: 10.5
      })
    },
    geolocate() {
      this.geolocating = true
      const geolocatingInterval = setInterval(() => {
        this.geolocating = !this.geolocating
      }, 500)
      navigator.geolocation.getCurrentPosition(position => {
        clearInterval(geolocatingInterval)
        this.geolocating = false
        if(geolocationMarkerEl) geolocationMarkerEl.remove()
        geolocationMarkerEl = document.createElement('div')
        geolocationMarkerEl.classList.add('geolocation-marker')
        new mapbox.Marker({
          element: geolocationMarkerEl
        })
          .setLngLat([position.coords.longitude, position.coords.latitude])
          .addTo(map)
        
        map.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 16
        })
      })
    }
  },
  watch: {
    'services': {
      handler(data) {
        data.forEach(service => {
          if(!service.layers) return
          if(map.getLayer(`${service.slug}-units`)) map.setLayoutProperty(`${service.slug}-units`, 'visibility', service.layers.units ? 'visible' : 'none')
          if(map.getLayer(`${service.slug}-units-points`)) map.setLayoutProperty(`${service.slug}-units-points`, 'visibility', service.layers.units ? 'visible' : 'none')
          if(map.getLayer(`${service.slug}-trips`)) map.setLayoutProperty(`${service.slug}-trips`, 'visibility', service.layers.trips ? 'visible' : 'none')
        })
      },
      deep: true
    }
  }
}
</script>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/icon?family=Material+Icons');
@import url('https://api.mapbox.com/mapbox-gl-js/v2.4.1/mapbox-gl.css');

body {
  margin: 0;
  font-family: 'Inter', Arial, Helvetica, sans-serif;
  font-size: 1.1rem;
  color: #eee;
}


main {
  position: fixed;
  top: 0;
  height: 100vh;
  width: 100vw;
}

* {
  -webkit-tap-highlight-color: transparent;
}

header {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
  padding: 21px;

  h1 {
    font-size: 1.8rem;
    margin: 0;
  }
}

aside {
  display: flex;
  flex-flow: column nowrap;
  position: fixed;
  bottom: 0;
  right: 0;
  min-height: 80px;
  margin: 20px;
  padding: 20px;
  border-radius: 20px;
  -webkit-backdrop-filter: saturate(180%) blur(10px);
  backdrop-filter: saturate(180%) blur(10px);
  z-index: 2;

  .title {
    font-size: 1.6rem;
    font-weight: 700;
    margin-bottom: 12px;
  }
}

.top {
  top: 0;
  bottom: unset;
  min-width: 15px;
  min-height: 15px;

  .expand {
    position: absolute;
    top: 0;
    right: 0;
    margin: 16px;
    font-size: 1.6rem;
    font-weight: 700;
    cursor: pointer;
  }

  h2 {
    font-size: 1.8rem;
    font-weight: 700;
    margin: 0 0 12px;
  }

  .service {
    display: flex;
    flex-flow: column nowrap;
    margin-bottom: 16px;

    .header {
      display: flex;
      flex-flow: row nowrap;
      align-items: center;

      img {
        height: 30px;
        margin-right: 8px;
      }

      .name {
        font-size: 1.5rem;
        font-weight: 600;
      }
    }

    .layers {
      display: flex;
      flex-flow: row nowrap;
      align-items: center;
      margin-top: 6px;

      div {
        display: flex;
        flex-flow: row nowrap;
        align-items: center;
        margin: 0 6px;

        &:nth-child(1) {
          i {
            font-size: 0.8rem;
          }
        }
      }
    }
  }

  .cities {
    display: flex;
    flex-flow: column nowrap;
    align-items: flex-start;

    .title {
      margin-bottom: 6px;
    }

    .grid {
      display: flex;
      flex-flow: row wrap;
      max-width: 200px;

      .name {
        margin: 4px;
        font-size: 1.2rem;
        font-weight: 600;
      }
    }
  }
}

a {
  color: #ffffff;
  font-weight: 600;
  text-decoration: none;
  border-bottom: 0.5px solid #ffffff;
  cursor: pointer;
  transition: all .3s;

  &:hover {
    color: #bdbdbd;
    border-bottom: 0.5px solid #bdbdbd;
  }
  
  &:active {
    transform: translateY(1px);
  }

  &.back {
    display: block;
    width: fit-content;
    margin: 20px auto 0;
  }
}

.tier, .cityscoot, .yego {
  .head {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;

    .close {
      margin-right: 6px;
      font-size: 2rem;
      cursor: pointer;
    }

    img {
      height: 35px;
      margin-right: 12px;
      border-radius: 8px;
      cursor: pointer;
    }

    .name {
      margin-right: 6px;
      font-size: 1.8rem;
      font-weight: 800;
    }
  }

  .battery {
    position: relative;
    width: 80px;
    height: 40px;
    margin: 12px 0;
    padding: 1px;
    border: 3px solid #bdbdbd;
    border-radius: 12px;

    &::after {
      position: absolute;
      top: 30%;
      right: -7.5px;
      content: '';
      height: 18px;
      width: 3px;
      background: #bdbdbd;
      display: block;
      border-radius: 0 4px 4px 0;
    }

    div {
      display: flex;
      flex-flow: column nowrap;
      justify-content: center;
      align-items: center;
      height: 100%;
      border-radius: 8px;

      span {
        font-weight: 800;
        color: #000;
      }

      &.low {
        background-color: #EF5350;
      }

      &.medium {
        background-color: #f1e253;
      }

      &.good {
        background-color: #39d33e;
      }
    }

    & > span {
      position: absolute;
      top: 0;
      right: 0;
      margin: 10px 8px;
      font-size: 1.2rem;
      font-weight: 800;
    }
  }

  .more-info {
    display: flex;
    margin-top: 12px;
    font-size: 1.25rem;
    font-weight: 600;
    cursor: pointer;
  }
}

button {
  margin-top: 20px;
  background-color: #000;
  color: #eee;
  font-family: 'nyt-cheltenham', Arial, Helvetica, sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
  border: none;
  outline: none;
  border-radius: 15px;
  padding: 10px 15px;
  transition: .3s;
  cursor: pointer;

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    background-color: #222222;
    color: #7a7a7a;
    cursor: default;
    -webkit-box-shadow: none;
    -moz-box-shadow: none;
    box-shadow: none;
  }
}

footer {
  position: fixed;
  bottom: 0;
  padding: 20px;
}

.geolocate {
  position: fixed;
  bottom: 0;
  right: 60px;
  margin: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 1.9rem;
  padding: 1px;
}

@media only screen and (max-width: 601px) {
  header h1 {
    font-size: 1.5rem;
  }

  .top {
    top: unset;
    bottom: 10px;
    right: 0;
    margin: 8px;
  }

  footer {
    padding: 6px;
  }
}

.geolocation-marker {
  width: 10px;
  height: 10px;
  background-color: #4285F4;
  border: 2px solid white;
  border-radius: 50%;
  -webkit-box-shadow: 0px 0px 0px 8px rgba(66,133,244,0.2);
  -moz-box-shadow: 0px 0px 0px 8px rgba(66,133,244,0.2);
  box-shadow: 0px 0px 0px 8px rgba(66,133,244,0.2);
}

.mapboxgl-control-container {
  display: none;
}
</style>