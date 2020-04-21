const fs = require('fs')
const path = require('path')
const { homedir } = require('os')

module.exports = function(loader, toggl, timeSlotter, asker, config) {

  this.run = async () => {
    const clients = await toggl.getClients()
    const client = await chooseClient(asker, clients)
    const moment = loader.load('moment')

    const montly = {
      start: moment().add(-1, 'month').startOf("month"),
      end: moment().add(-1, 'month').endOf("month"),
    }

    const summary = await getPdf(toggl, client.id, config.togglWorkspace, montly.start.format("YYYY-MM-DD"), montly.end.format("YYYY-MM-DD"))

    if(summary != null) {
      writePdf(`${client.name.toLowerCase()}_report_month_${montly.start.format("YYYY-MM-DD")}.pdf`, summary)
    }
  }

  this.help = () => {
    return "download client report as PDF"
  }
}

async function chooseClient(asker, clients) {
  const choices = convertToChoices(clients)

  return asker.autocompleteInquire('Select Client name', choices)
}

function convertToChoices(clients) {
  return clients.map(it => {
    return {
      name: it.name,
      value: it
    }
  })
}

async function getPdf(toggl, client, workspace, start, end) {
  try {
    const url = `https://www.toggl.com/reports/api/v3/workspace/${workspace}/summary/time_entries.pdf`
    return await toggl.rawReportsPost(url, {
      user_agent: "toggl-tracker",
      client_ids: [client],
      date_format: "DD-MM-YYYY",
      start_date: start,
      end_date: end,
      grouping: "projects",
      sub_grouping: "users",
      billable: true,
      hide_amounts: true,
      hide_rates: true,
      order_by: "title",
      order_dir: "asc",
      duration_format: "improved"
    }, 'arraybuffer')
  } catch(e) {
    console.error(String(e.response.data))
    return null
  }
}

function writePdf(name, content) {
  try {
    fs.writeFileSync(path.join(homedir(), '/Desktop/', name), content)
  } catch(e) {
    console.error(e.message)
  }
}