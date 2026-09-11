export class LIFNeuron {
  constructor(nodeData) {
    this.id = nodeData.id;
    this.label = nodeData.label;
    this.type = nodeData.type;
    this.vRest = nodeData.v_rest || -70.0;
    this.v = this.vRest;
    this.vThresh = -50.0;
    this.vReset = -75.0;
    this.tau = 12.0; // Zar zaman sabiti (ms)
    this.spiked = false;
  }

  update(inputCurrent, dt = 1.0) {
    const dv = (-(this.v - this.vRest) + inputCurrent) / this.tau * dt;
    this.v += dv;

    if (this.v >= this.vThresh) {
      this.spiked = true;
      this.v = this.vReset;
    } else {
      this.spiked = false;
    }
    return this.spiked;
  }
}

export class FlyWireConnectomeEngine {
  constructor(networkData) {
    this.neurons = {};
    networkData.nodes.forEach(node => {
      this.neurons[node.id] = new LIFNeuron(node);
    });

    this.synapses = networkData.synapses.map(syn => ({
      pre: syn.pre,
      post: syn.post,
      weight: syn.count * syn.sign * 0.45 // Biyolojik ölçeklendirme
    }));
  }

  step(distLeft, distRight) {
    const currents = {};
    Object.keys(this.neurons).forEach(id => currents[id] = 0.0);

    // 1. Duyusal Girdiler (Gözlerden gelen uyarım)
    Object.values(this.neurons).forEach(neuron => {
      if (neuron.type === 'sensory_left') {
        currents[neuron.id] += 120.0 / Math.max(0.6, distLeft);
      } else if (neuron.type === 'sensory_right') {
        currents[neuron.id] += 120.0 / Math.max(0.6, distRight);
      }
    });

    // 2. Sinaps Aktarımı (Ateşlenen nöronlar sinapslar üzerinden akım iletir)
    this.synapses.forEach(syn => {
      if (this.neurons[syn.pre] && this.neurons[syn.pre].spiked) {
        if (currents[syn.post] !== undefined) {
          currents[syn.post] += syn.weight;
        }
      }
    });

    // 3. Nöron Durum Güncellemesi
    const spikes = {};
    Object.values(this.neurons).forEach(neuron => {
      spikes[neuron.id] = neuron.update(currents[neuron.id]);
    });

    // 4. Motor Çıktı Kontrolü
    const motorLSpike = Object.values(this.neurons)
      .some(n => n.type === 'motor_left' && n.spiked);
    const motorRSpike = Object.values(this.neurons)
      .some(n => n.type === 'motor_right' && n.spiked);

    return {
      motorL: motorLSpike ? 0.45 : 0.05,
      motorR: motorRSpike ? 0.45 : 0.05,
      spikes: spikes
    };
  }
}
