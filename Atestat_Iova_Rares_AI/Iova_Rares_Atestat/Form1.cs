using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Iova_Rares_Atestat
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
        }

        public void pause()
        {
            gameTimer.Stop();
        }

        GameManager gameMaster;

        private void Form1_Load(object sender, EventArgs e)
        {
            gameMaster = new GameManager(this, gamePanel, 80);
            gameMaster.snakeEye.move(new Point(this.Location.X - gameMaster.snakeEye.Width, this.Location.Y));
        }

        private void trackBar1_Scroll(object sender, EventArgs e)
        {
            gameTimer.Interval = trackBar1.Value;
            textBox2.Text = (double)trackBar1.Value / 1000 + "";
        }

        private void gameTimer_Tick(object sender, EventArgs e)
        {
            gameMaster.runTick();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            gameMaster.drawGame();
            gameTimer.Start();
        }

        private void Form1_Move(object sender, EventArgs e)
        {
            if (gameMaster != null && gameMaster.snakeEye != null)
            {
                gameMaster.snakeEye.move(new Point(this.Location.X - gameMaster.snakeEye.Width, this.Location.Y));
            }
        }

        private void Form1_Resize(object sender, EventArgs e)
        {
            if (gameMaster != null && gameMaster.snakeEye != null)
            {
                gameMaster.snakeEye.move(new Point(this.Location.X - gameMaster.snakeEye.Width, this.Location.Y));
            }
        }

        private void button2_Click(object sender, EventArgs e) {
            gameMaster.saveGeneration(textBox1.Text);
        }

        private void button3_Click(object sender, EventArgs e) {
            gameMaster.loadGeneration(textBox1.Text);
        }

        private void button4_Click(object sender, EventArgs e) {
            gameMaster.drawsGame = true;
        }

        private void button5_Click(object sender, EventArgs e) {
            gameMaster.drawsGame = false;
        }

        private void trackBar2_Scroll(object sender, EventArgs e) {
            GeneticManager.generationTime = trackBar2.Value;
            textBox3.Text = trackBar2.Value + "";
        }

        private void trackBar3_Scroll(object sender, EventArgs e) {
            gameMaster.foodCount = trackBar3.Value;
            textBox4.Text = trackBar3.Value + "";
        }

        private void trackBar4_Scroll(object sender, EventArgs e)
        {
            int ex = trackBar4.Value;
            double mutRate = 1;
            for(int i = 1;i < ex; i++)
            {
                mutRate /= 10;
            }
            textBox5.Text = mutRate + "";
            GeneticManager.mutationFactor = mutRate;
        }

        private void button6_Click(object sender, EventArgs e)
        {
            gameMaster.startVisionWindow();
            gameMaster.snakeEye.move(new Point(this.Location.X - gameMaster.snakeEye.Width, this.Location.Y));
        }

        private void button7_Click(object sender, EventArgs e)
        {
            gameMaster.startNewGeneration(null);
        }

        private void button8_Click(object sender, EventArgs e)
        {
            gameMaster.snakes.Clear();
            gameMaster.startNewGeneration(null);
        }
    }
}
