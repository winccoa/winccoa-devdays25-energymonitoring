# Energy Monitoring Project example

![pic 1](https://github.com/user-attachments/assets/52c670a9-0274-4ae1-8838-2edeb5e02d80)

# Introduction

During the Hackathon at the Developer Days, A project example was introduced as part of the event. The winner of the Hackathon was **Patrick Schneider** from **Viscom**. 
Congratulations to him for winning the free development license!

# Project Description

The application description is divided into two parts:

**First Part:**

  **Using NPM package do the following tasks:**
  
    •Add a energy consumption simulation  
    •Get system information of your PC
    •Comparing values
    •Get Energy prices 
    
  **Using WinCC OA , do the following:**
  
    •Create Datapoints related to Lighting, HVAC & Appliance and Equipment
    •Create a panel and name it "Energy usage", containing:
      -Energy usage of each system 
      -Total energy consumption, with options to view data for a specified period (1-week, current day, or hours).
      -Comparison of energy usage between the 3 Systems (difference must be shown in %)

  <img width="1904" height="964" alt="pic 2" src="https://github.com/user-attachments/assets/aa264ea3-7d05-4dc4-ba9b-09aa98223585" />
      

    •Create a panel and name it "Energy price", it should contain the following information:
      -System information of the machine where your project is running
      -Energy price of the day in your country
      -Energy cost peer system of the actual day
      -Total energy cost of your systems for the actual day

  <img width="1901" height="972" alt="pic 3" src="https://github.com/user-attachments/assets/1ef22782-60a4-472b-8b50-f2f1ea1686b5" />

      
    •Create a topology that allows the navigation between the previously create panel


  **Important information:**
  
    •The systems to monitor are: Lighting, HVAC, Appliance, and Equipment.
    •Each datapoint should contain the following information per system:
      -Voltage (V)
      -Current (I)
      -Energy (KWh)
      -Power (W)
      -Cost (€)
    •All datapoints should have 2 weeks of information archived


**Second Part:**

  In the panel **"Energy Price"**, add the following:
  
    •Display a trend showing the average energy price for the past 2 weeks.


## Content:
This repository includes the project folder, readme file, and the legal information of the application example, organized as following:
- **EnergyMonitoring:** The project files
- **LEGAL_INFO.md:** Legal Information
- **LICENSE.md:** License Information
- **README.md:** this file


