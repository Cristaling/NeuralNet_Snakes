using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Iova_Rares_Atestat
{
    class Brain
    {

        List<NeuronLayer> layers = new List<NeuronLayer>();
        List<double> outputs = new List<double>();

        public Brain(int inputNr, int outputNr, int hiddenNr, int hiddenSize)
        {
            layers.Add(new NeuronLayer(inputNr, hiddenSize));
            for (int i = 1; i < hiddenNr; i++)
            {
                layers.Add(new NeuronLayer(hiddenSize, hiddenSize));
            }
            layers.Add(new NeuronLayer(outputNr, hiddenSize));
        }

        public void setWeights(List<double> newWeights)
        {
            int index = 0;
            foreach (NeuronLayer neuronLayer in layers)
            {
                List<double> newWeightsL = new List<double>();
                int weightNr = neuronLayer.getWeightNumber();
                for (int i = 1; i <= weightNr; i++)
                {
                    newWeightsL.Add(newWeights[index]);
                    index++;
                }
                neuronLayer.setWeights(newWeightsL);
            }
        }

        public List<double> getWeights()
        {
            List<double> result = new List<double>();
            foreach (NeuronLayer neuronLayer in layers)
            {
                List<double> layerWeights = neuronLayer.getWeights();
                foreach (double weight in layerWeights)
                {
                    result.Add(weight);
                }
            }
            return result;
        }

        public void setInputs(List<double> newInputs)
        {
            List<double> result = null;
            foreach (NeuronLayer neuronLayer in layers)
            {
                if (result == null)
                {
                    neuronLayer.setInputs(newInputs);
                }
                else
                {
                    neuronLayer.setInputs(result);
                }
                result = neuronLayer.getOutputs();
            }
            outputs = result;
        }

        public List<double> getOutputs()
        {
            return outputs;
        }

    }
}
